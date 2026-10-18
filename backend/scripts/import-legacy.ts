import { parseArgs } from 'node:util';
import { and, eq, inArray } from 'drizzle-orm';
import mysql, { type Connection, type RowDataPacket } from 'mysql2/promise';
import { z } from 'zod';
import { createDatabase, type Database } from '../src/platform/db/client.js';
import { listings } from '../src/platform/db/schema.js';
import { databaseUrl, safeError } from './lib/environment.js';
import {
  normalizeLegacyListing,
  normalizeLegacyOpenHouse,
  text,
  type LegacyRow,
  type ListingInsert,
  type OpenHouseInsert,
} from './lib/normalize-legacy.js';
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

// Fixed table names and parameterized values: no raw user input becomes SQL syntax.
async function* readBatches(
  connection: Connection,
  table: Table,
  batchSize: number,
  limit?: number,
): AsyncGenerator<LegacyRow[]> {
  let afterId = -2_147_483_649;
  let scanned = 0;
  while (limit === undefined || scanned < limit) {
    const remaining = limit === undefined ? batchSize : Math.min(batchSize, limit - scanned);
    const query =
      table === 'rets_property'
        ? 'SELECT * FROM rets_property WHERE id > ? ORDER BY id ASC LIMIT ?'
        : 'SELECT * FROM rets_openhouse WHERE id > ? ORDER BY id ASC LIMIT ?';
    const [rows] = await connection.query<RowDataPacket[]>(query, [afterId, remaining]);
    if (!rows.length) break;
    const nextId = Number(rows.at(-1)?.id);
    if (!Number.isSafeInteger(nextId) || nextId <= afterId)
      throw new Error(`${table} must have a unique, increasing integer id primary key.`);
    yield rows;
    afterId = nextId;
    scanned += rows.length;
  }
}

async function listingMap(db: Database, source: string, rows: LegacyRow[]) {
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
      help: { type: 'boolean', short: 'h' },
    },
    strict: true,
  });
  if (values.help) {
    console.log(
      'Usage: npm run db:import-legacy --workspace @idx/api -- [--write] [--batch-size=250] [--limit=1000]',
    );
    console.log(
      'Default: dry run (reads MySQL and reports normalization; no PostgreSQL writes). --limit applies to each table.',
    );
    console.log(
      'Required: LEGACY_MYSQL_URL. For writes: DATABASE_URL after db:migrate. Optional: LEGACY_SOURCE=crmls, LEGACY_TIME_ZONE=America/Los_Angeles.',
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
    .parse(process.env.LEGACY_SOURCE || 'crmls');
  const timeZone = process.env.LEGACY_TIME_ZONE || 'America/Los_Angeles';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format();
  } catch {
    throw new Error('LEGACY_TIME_ZONE must be a valid IANA time zone.');
  }
  if (!process.env.LEGACY_MYSQL_URL)
    throw new Error(
      'Set LEGACY_MYSQL_URL=mysql://user:password@localhost:3306/rets in backend/.env.',
    );
  const legacyUrl = new URL(process.env.LEGACY_MYSQL_URL);
  if (legacyUrl.protocol !== 'mysql:' || !legacyUrl.pathname.slice(1))
    throw new Error('LEGACY_MYSQL_URL must be a mysql:// URL with a database name.');
  const database = values.write ? createDatabase(databaseUrl()) : null;
  let connection: Connection | undefined;
  try {
    connection = await mysql.createConnection({
      host: legacyUrl.hostname,
      port: legacyUrl.port ? Number(legacyUrl.port) : 3306,
      user: decodeURIComponent(legacyUrl.username),
      password: decodeURIComponent(legacyUrl.password),
      database: decodeURIComponent(legacyUrl.pathname.slice(1)),
      dateStrings: true,
      supportBigNumbers: true,
      bigNumberStrings: true,
      charset: 'utf8mb4',
    });
    // These are SELECT-only source reads. MyISAM legacy openhouses cannot provide
    // a transactional snapshot; pause the source writer during a full migration.
    const stats = {
      mode: values.write ? 'write' : 'dry-run',
      listings: emptyStats(),
      openHouses: emptyStats(),
    };
    const seen = new Set<string>();
    for await (const batch of readBatches(connection, 'rets_property', batchSize, limit)) {
      const normalized: ListingInsert[] = [];
      for (const row of batch) {
        stats.listings.scanned += 1;
        const result = normalizeLegacyListing(row, source);
        recordWarnings(stats.listings, result.warnings);
        if (!result.value) {
          stats.listings.skipped += 1;
          continue;
        }
        seen.add(result.value.externalId);
        stats.listings.accepted += 1;
        normalized.push(result.value);
      }
      if (database)
        stats.listings.written += (await upsertListings(database.db, normalized)).length;
      console.log(
        `Listings: scanned ${stats.listings.scanned}, accepted ${stats.listings.accepted}, written ${stats.listings.written}.`,
      );
    }
    for await (const batch of readBatches(connection, 'rets_openhouse', batchSize, limit)) {
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
        const result = normalizeLegacyOpenHouse(row, listingId, source, timeZone);
        recordWarnings(stats.openHouses, result.warnings);
        if (!result.value) {
          stats.openHouses.skipped += 1;
          continue;
        }
        stats.openHouses.accepted += 1;
        normalized.push(result.value);
      }
      if (database)
        stats.openHouses.written += (await upsertOpenHouses(database.db, normalized)).length;
      console.log(
        `Open houses: scanned ${stats.openHouses.scanned}, accepted ${stats.openHouses.accepted}, written ${stats.openHouses.written}.`,
      );
    }
    console.log(JSON.stringify(stats, null, 2));
    console.log(
      'Source rows were never modified. Imports upsert records; they do not remove listings or events missing from a later export.',
    );
  } finally {
    await connection?.end();
    await database?.pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(safeError(error));
  process.exitCode = 1;
});
