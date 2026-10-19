import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { and, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { createDatabase, type Database } from '../src/platform/db/client.js';
import { listings } from '../src/platform/db/schema.js';
import { readDumpRows } from './lib/dump-reader.js';
import { databaseUrl, safeError } from './lib/environment.js';
import {
  normalizeMlsListing,
  normalizeMlsOpenHouse,
  text,
  type MlsRow,
  type ListingInsert,
  type OpenHouseInsert,
} from './lib/normalize-mls.js';
import { upsertListings, upsertOpenHouses } from './lib/upsert.js';

type Table = 'rets_property' | 'rets_openhouse';
type Stats = {
  scanned: number;
  accepted: number;
  skipped: number;
  written: number;
  warnings: Record<string, number>;
};
const emptyStats = (): Stats => ({ scanned: 0, accepted: 0, skipped: 0, written: 0, warnings: {} });
function recordWarnings(stats: Stats, warnings: string[]) {
  for (const warning of warnings) stats.warnings[warning] = (stats.warnings[warning] ?? 0) + 1;
}

// Streams the dump file in batches; a limit applies to each table.
async function* readBatches(
  file: string,
  table: Table,
  batchSize: number,
  limit?: number,
): AsyncGenerator<MlsRow[]> {
  let batch: MlsRow[] = [];
  let scanned = 0;
  for await (const row of readDumpRows(file, table)) {
    batch.push(row);
    scanned += 1;
    if (batch.length === batchSize) {
      yield batch;
      batch = [];
    }
    if (limit !== undefined && scanned >= limit) break;
  }
  if (batch.length) yield batch;
}

async function listingMap(db: Database, source: string, rows: MlsRow[]) {
  const externalIds = [...new Set(rows.map((row) => text(row.L_ListingID)).filter(Boolean))];
  if (!externalIds.length) return new Map<string, string>();
  const matches = await db
    .select({ externalId: listings.externalId, id: listings.id })
    .from(listings)
    .where(and(eq(listings.source, source), inArray(listings.externalId, externalIds)));
  return new Map(matches.map((row) => [row.externalId, row.id]));
}

async function main() {
  const { values } = parseArgs({
    options: {
      write: { type: 'boolean', default: false },
      'batch-size': { type: 'string', default: '250' },
      limit: { type: 'string' },
      dir: { type: 'string' },
      'keep-raw': { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h' },
    },
    strict: true,
  });
  if (values.help) {
    console.log(
      'Usage: npm run db:import -- [--dir=<dump folder>] [--write] [--batch-size=250] [--limit=1000] [--keep-raw]',
    );
    console.log(
      'Default: dry run (reads the dump files and reports normalization; no PostgreSQL writes). --limit applies to each table. --keep-raw also stores each source row in raw_data.',
    );
    console.log(
      'Required: a folder with rets_property.sql and rets_openhouse.sql (--dir or MLS_DUMP_DIR). For writes: DATABASE_URL after db:migrate. Optional: MLS_SOURCE=crmls, MLS_TIME_ZONE=America/Los_Angeles.',
    );
    return;
  }
  const batchSize = z.coerce.number().int().min(1).max(1000).parse(values['batch-size']);
  const limit =
    values.limit === undefined ? undefined : z.coerce.number().int().positive().parse(values.limit);
  const source = z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[A-Za-z0-9_-]+$/)
    .parse(process.env.MLS_SOURCE || 'crmls');
  const timeZone = process.env.MLS_TIME_ZONE || 'America/Los_Angeles';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format();
  } catch {
    throw new Error('MLS_TIME_ZONE must be a valid IANA time zone.');
  }
  const directory = values.dir || process.env.MLS_DUMP_DIR;
  if (!directory)
    throw new Error('Pass --dir=<folder> or set MLS_DUMP_DIR to the folder with the dump files.');
  const files = {
    rets_property: join(directory, 'rets_property.sql'),
    rets_openhouse: join(directory, 'rets_openhouse.sql'),
  } satisfies Record<Table, string>;
  for (const file of Object.values(files))
    await access(file).catch(() => {
      throw new Error(`Dump file not found: ${file}`);
    });
  // Source rows roughly double the stored size, so they are kept only on request.
  const keepRaw = values['keep-raw'];
  const database = values.write ? createDatabase(databaseUrl()) : null;
  try {
    // Dump files are only read, never modified.
    const stats = {
      mode: values.write ? 'write' : 'dry-run',
      listings: emptyStats(),
      openHouses: emptyStats(),
    };
    const seen = new Set<string>();
    for await (const batch of readBatches(files.rets_property, 'rets_property', batchSize, limit)) {
      const normalized: ListingInsert[] = [];
      for (const row of batch) {
        stats.listings.scanned += 1;
        const result = normalizeMlsListing(row, source);
        recordWarnings(stats.listings, result.warnings);
        if (!result.value) {
          stats.listings.skipped += 1;
          continue;
        }
        seen.add(result.value.externalId);
        stats.listings.accepted += 1;
        normalized.push(keepRaw ? result.value : { ...result.value, rawData: {} });
      }
      if (database)
        stats.listings.written += (await upsertListings(database.db, normalized)).length;
      console.log(
        `Listings: scanned ${stats.listings.scanned}, accepted ${stats.listings.accepted}, written ${stats.listings.written}.`,
      );
    }
    for await (const batch of readBatches(
      files.rets_openhouse,
      'rets_openhouse',
      batchSize,
      limit,
    )) {
      const ids = database
        ? await listingMap(database.db, source, batch)
        : new Map([...seen].map((id) => [id, '00000000-0000-4000-8000-000000000000']));
      const normalized: OpenHouseInsert[] = [];
      for (const row of batch) {
        stats.openHouses.scanned += 1;
        const listingId = ids.get(text(row.L_ListingID));
        if (!listingId) {
          stats.openHouses.skipped += 1;
          recordWarnings(stats.openHouses, ['open_house.orphan']);
          continue;
        }
        const result = normalizeMlsOpenHouse(row, listingId, source, timeZone);
        recordWarnings(stats.openHouses, result.warnings);
        if (!result.value) {
          stats.openHouses.skipped += 1;
          continue;
        }
        stats.openHouses.accepted += 1;
        normalized.push(keepRaw ? result.value : { ...result.value, rawData: {} });
      }
      if (database)
        stats.openHouses.written += (await upsertOpenHouses(database.db, normalized)).length;
      console.log(
        `Open houses: scanned ${stats.openHouses.scanned}, accepted ${stats.openHouses.accepted}, written ${stats.openHouses.written}.`,
      );
    }
    console.log(JSON.stringify(stats, null, 2));
    console.log(
      'Source files were not modified. Imports upsert records; they do not remove listings or events missing from a later export.',
    );
  } finally {
    await database?.pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(safeError(error));
  process.exitCode = 1;
});
