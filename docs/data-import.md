# Data import

## Dataset

The production inventory comes from a historical MLS export supplied by the IDX Exchange SDE
Internship as phpMyAdmin SQL dump files:

| File                 | Contents                                                              |
| -------------------- | --------------------------------------------------------------------- |
| `rets_property.sql`  | 54,438 listing rows; 54,434 unique listings, almost all in California |
| `rets_openhouse.sql` | 15,088 recorded open houses, linked to listings by MLS listing number |

The dumps are not part of the repository. They are a snapshot: the data is imported once and is
not synchronized with a live MLS. The demo seed (`npm run db:seed`) is unrelated to this data and
is meant for development and tests.

## Import process

The importer streams the dump files directly, normalizes each row and upserts it into
PostgreSQL. No MySQL server is needed.

1. Put `rets_property.sql` and `rets_openhouse.sql` in one folder outside Git.
2. Apply migrations to the destination: `npm run db:migrate`.
3. Optionally set the source settings in `backend/.env`:

   ```dotenv
   MLS_DUMP_DIR=D:/data/mls
   MLS_SOURCE=crmls
   MLS_TIME_ZONE=America/Los_Angeles
   ```

   `MLS_DUMP_DIR` is the default for `--dir`. `MLS_SOURCE` namespaces every imported record
   (`source` column); keep it the same on every run so reruns update rather than duplicate.
   `MLS_TIME_ZONE` is the IANA zone in which the source records open-house times.

4. Run a dry run, review the report, then write:

   ```sh
   npm run db:import -- --dir=D:/data/mls --limit=1000          # dry run, first 1,000 rows per file
   npm run db:import -- --dir=D:/data/mls                       # dry run on everything
   npm run db:import -- --dir=D:/data/mls --write --batch-size=500
   ```

   Use an absolute path for `--dir`; the command runs inside the `backend` workspace.

| Option         | Default        | Meaning                                  |
| -------------- | -------------- | ---------------------------------------- |
| `--dir`        | `MLS_DUMP_DIR` | Folder containing the two dump files     |
| `--write`      | off            | Without it, PostgreSQL is not touched    |
| `--batch-size` | 250            | Rows per upsert batch (1–1000)           |
| `--limit`      | none           | Maximum rows read from **each** file     |
| `--keep-raw`   | off            | Also store each source row in `raw_data` |

### Behavior

- Dump files are read as text and never modified. Only `INSERT` statements for the two tables
  are parsed; strings, escapes and `NULL` follow MySQL dump syntax.
- Listings are upserted on `(source, external_id)`. A rerun updates existing rows and keeps their
  UUIDs, so detail URLs stay stable. Rows that repeat an MLS number collapse into one listing.
- Open houses are linked to the listing UUID through the MLS listing number and upserted on
  `(source, external_id)`. An event whose listing is not in the listing file is skipped as an
  orphan.
- Records missing from a later export are **not** deleted.
- By default `raw_data` is stored empty. The full source row roughly doubles the database size
  (about 530 MB instead of about 230 MB for this dataset), which matters on free database tiers.
  Pass `--keep-raw` when the original rows are needed for diagnostics. `raw_data` is never exposed
  by the API.
- The report lists scanned, accepted, skipped and written counts for each table, plus counts per
  warning type. Errors are reported without connection strings or row contents.

### Reference run

A full write of this dataset into PostgreSQL 18 takes under a minute on a laptop and produces
54,434 listings and 13,424 open houses (1,664 events reference listings outside the export). The
resulting database is about 230 MB.

## Field mapping

### Listings (`rets_property` → `listings`)

| Source column                               | Destination         | Rule                                                                                                       |
| ------------------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------- |
| `L_ListingID`                               | `external_id`       | Required; rows without it are skipped                                                                      |
| `L_Address`, `L_City`, `L_State`, `L_Zip`   | address fields      | Trimmed text                                                                                               |
| `L_SystemPrice`                             | `price`             | Decimal 0–999,999,999,999.99                                                                               |
| `L_Keyword2`                                | `bedrooms`          | Non-negative integer                                                                                       |
| `LM_Dec_3`                                  | `bathrooms`         | Decimal 0–9,999.9                                                                                          |
| `LM_Int2_3`                                 | `square_feet`       | Non-negative integer                                                                                       |
| `ListingContractDate`                       | `listed_at`         | Valid calendar date `YYYY-MM-DD`                                                                           |
| `LMD_MP_Latitude`, `LMD_MP_Longitude`       | coordinates         | Within -90..90 and -180..180                                                                               |
| `L_Photos`                                  | `photos`            | JSON array or single URL; HTTP(S) only, no embedded credentials, duplicates removed, at most 100           |
| `L_Remarks`                                 | `description`       | Trimmed text                                                                                               |
| `L_Class`                                   | `property_type`     | Text or null                                                                                               |
| `PropertySubTypeAdditional`, else `L_Type_` | `property_sub_type` | Text or null; classified at read time (see [Business rules](business-rules.md#4-home-type-classification)) |
| `YearBuilt`                                 | `year_built`        | Integer 1–9999                                                                                             |
| `LotSizeAcres`                              | `lot_size_acres`    | Non-negative decimal                                                                                       |
| `L_Keyword5`                                | `parking_spaces`    | Non-negative integer                                                                                       |

### Open houses (`rets_openhouse` → `open_houses`)

| Source                                                                          | Destination   | Rule                                                                     |
| ------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------ |
| `OpenHouseKey`, `OpenHouseId`, `OpenHouseKeyNumeric` (in `all_data`), else `id` | `external_id` | First non-empty value                                                    |
| `L_ListingID`                                                                   | `listing_id`  | Must match an imported listing                                           |
| `OpenHouseDate`, `OH_StartDate`, `all_data.OpenHouseDate`, else start timestamp | `date`        | First valid date; rows without one are skipped                           |
| `OH_StartTime` / `OH_EndTime`, else start and end timestamps                    | times         | `HH:MM[:SS]`; timestamps with an offset are converted to `MLS_TIME_ZONE` |
| `all_data.OpenHouseRemarks`                                                     | `remarks`     | Trimmed text                                                             |
| —                                                                               | `time_zone`   | `MLS_TIME_ZONE`                                                          |

### Invalid values

An invalid optional value (an impossible date such as `2024-02-30`, a negative count, coordinates
out of range, a non-HTTP photo URL) becomes `null` or is dropped, and the row is still imported
with a warning such as `listing.invalid_price`. Values are never replaced with zero or guessed.

## Verifying an import

After a write run:

1. Compare the importer's `written` counts with `SELECT count(*) FROM listings` and
   `SELECT count(*) FROM open_houses`. A difference of a few listings is expected when the export
   repeats an MLS number.
2. Review the warning counts and spot-check a few skipped or warned rows in the source.
3. Search a few known cities and ZIP codes in the web app and open several listings, including
   ones with open houses.
