import { resolve } from 'node:path';
import { and, eq, sql } from 'drizzle-orm';
import { createDatabase } from '../../src/platform/db/client.js';
import { applyMigrations } from '../../src/platform/db/migrate.js';
import { listings, openHouses } from '../../src/platform/db/schema.js';
import { PostgresListingRepository } from '../../src/modules/listings/infrastructure/postgres-listing-repository.js';
import { PostgresOpenHouseRepository } from '../../src/modules/open-houses/infrastructure/postgres-open-house-repository.js';
import { seedDemo } from '../../scripts/lib/demo-seed.js';
import {
  normalizeLegacyListing,
  normalizeLegacyOpenHouse,
} from '../../scripts/lib/normalize-legacy.js';
import { upsertListings, upsertOpenHouses } from '../../scripts/lib/upsert.js';

const connectionString = process.env.TEST_DATABASE_URL;
// Failing closed prevents accidental cleanup against the demo/production database.
if (
  connectionString &&
  !/(?:^|[_-])test(?:$|[_-])/.test(decodeURIComponent(new URL(connectionString).pathname.slice(1)))
) {
  throw new Error(
    'TEST_DATABASE_URL must name an isolated database containing a separate "test" segment (e.g. idx_test).',
  );
}
// Constructing a Pool does not open a connection. The skipped suite remains safe
// to load on machines without PostgreSQL, and CI supplies TEST_DATABASE_URL.
const database = createDatabase(connectionString ?? 'postgresql://localhost/idx_test');
const describePostgres = connectionString ? describe : describe.skip;
const migrationDirectory = resolve(__dirname, '../../db/migrations');
const search = { limit: 20, offset: 0, sortBy: 'price', sortOrder: 'ASC' } as const;

describePostgres('real PostgreSQL repositories and migrations', () => {
  const { db, pool } = database;
  const listingRepository = new PostgresListingRepository(db);
  const openHouseRepository = new PostgresOpenHouseRepository(db);

  beforeAll(async () => {
    await applyMigrations(pool, migrationDirectory);
    await db.delete(listings).where(sql`${listings.source} IN ('integration-test', 'demo')`);
    await seedDemo(db);
  });

  afterAll(async () => {
    await db.delete(listings).where(sql`${listings.source} IN ('integration-test', 'demo')`);
    await pool.end();
  });

  test('migrations are versioned and safely rerunnable', async () => {
    expect(await applyMigrations(pool, migrationDirectory)).toEqual([]);
    const result = await pool.query('SELECT count(*)::int AS count FROM _idx_migrations');
    expect(result.rows[0].count).toBeGreaterThanOrEqual(1);
  });

  test('filtering handles trimmed case-insensitive cities, decimal baths, exact ZIP and price ranges', async () => {
    const result = await listingRepository.search({
      ...search,
      city: ' pAsAdEnA ',
      minPrice: 700000,
      maxPrice: 900000,
      beds: 3,
      baths: 2.5,
    });
    expect(result.total).toBe(1);
    expect(result.results[0]).toMatchObject({
      externalId: 'DEMO-001',
      price: 825000,
      bathrooms: 2.5,
    });
    expect(result.results[0]).not.toHaveProperty('rawData');
    const boston = await listingRepository.search({ ...search, zipcode: '02108' });
    expect(boston.results[0]?.city).toBe('Boston');
    expect((await listingRepository.search({ ...search, city: "Pasadena' OR 1=1 --" })).total).toBe(
      0,
    );
  });

  test('pagination is stable for tied values, preserves totals and keeps NULL last in both directions', async () => {
    const all = await listingRepository.search({ ...search, city: 'Irvine' });
    const page1 = await listingRepository.search({ ...search, city: 'Irvine', limit: 1 });
    const page2 = await listingRepository.search({
      ...search,
      city: 'Irvine',
      limit: 1,
      offset: 1,
    });
    expect(all.total).toBe(3);
    expect([page1.results[0]?.id, page2.results[0]?.id]).toEqual(
      all.results.slice(0, 2).map((row) => row.id),
    );
    expect(page2.total).toBe(3);
    expect(all.results.at(-1)?.price).toBeNull();
    expect(
      (await listingRepository.search({ ...search, city: 'Irvine', sortOrder: 'DESC' })).results.at(
        -1,
      )?.price,
    ).toBeNull();
  });

  test('gets detail and linked open houses through internal UUIDs', async () => {
    const { results } = await listingRepository.search({ ...search, city: 'Boston' });
    const listing = results[0]!;
    expect(await listingRepository.findById(listing.id)).toEqual(listing);
    expect(await listingRepository.exists(listing.id)).toBe(true);
    expect(await listingRepository.findById('not-a-uuid')).toBeNull();
    expect(await listingRepository.exists('00000000-0000-4000-8000-000000000000')).toBe(false);
    const events = await openHouseRepository.findByListingId(listing.id);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      listingId: listing.id,
      startTime: '13:00:00',
      timeZone: 'America/New_York',
    });
    expect(events[0]).not.toHaveProperty('rawData');
  });

  test('legacy upsert preserves UUIDs, updates values and links real foreign keys', async () => {
    const normalized = normalizeLegacyListing(
      {
        L_ListingID: '000001',
        L_Address: 'Invented import address',
        L_City: ' Test City ',
        L_SystemPrice: '123456.10',
        LM_Dec_3: '2.5',
        L_Zip: '00123',
      },
      'integration-test',
    ).value!;
    const [first] = await upsertListings(db, [normalized, normalized]);
    const [updated] = await upsertListings(db, [{ ...normalized, price: '234567.20' }]);
    expect(updated?.id).toBe(first?.id);
    expect((await listingRepository.findById(first!.id))?.price).toBe(234567.2);
    const event = normalizeLegacyOpenHouse(
      { id: 7, OpenHouseDate: '2026-11-01', OH_StartTime: '13:00:00', OH_EndTime: '16:00:00' },
      first!.id,
      'integration-test',
      'America/Los_Angeles',
    ).value!;
    await upsertOpenHouses(db, [event, event]);
    await upsertOpenHouses(db, [{ ...event, remarks: 'Updated' }]);
    expect(await openHouseRepository.findByListingId(first!.id)).toEqual([
      expect.objectContaining({ remarks: 'Updated' }),
    ]);
    await db.delete(listings).where(eq(listings.id, first!.id));
    expect(await openHouseRepository.findByListingId(first!.id)).toEqual([]);
  });

  test('database constraints reject invalid money, duplicate source IDs and orphan events', async () => {
    await expect(
      db
        .insert(listings)
        .values({ source: 'integration-test', externalId: 'negative', price: '-1' }),
    ).rejects.toThrow();
    const [existing] = await db
      .select({ externalId: listings.externalId })
      .from(listings)
      .where(eq(listings.source, 'demo'))
      .limit(1);
    await expect(
      db.insert(listings).values({ source: 'demo', externalId: existing!.externalId }),
    ).rejects.toThrow();
    await expect(
      db.insert(openHouses).values({
        source: 'integration-test',
        externalId: 'orphan',
        listingId: '00000000-0000-4000-8000-000000000000',
        date: '2026-11-01',
        timeZone: 'UTC',
      }),
    ).rejects.toThrow();
    const invalid = await db
      .select()
      .from(listings)
      .where(and(eq(listings.source, 'integration-test'), eq(listings.externalId, 'negative')));
    expect(invalid).toEqual([]);
  });

  test('demo seed can rerun without duplicate records or changed listing identities', async () => {
    const before = await db
      .select({ id: listings.id })
      .from(listings)
      .where(eq(listings.source, 'demo'))
      .orderBy(listings.id);
    expect(await seedDemo(db)).toEqual({ listings: 12, openHouses: 3 });
    const after = await db
      .select({ id: listings.id })
      .from(listings)
      .where(eq(listings.source, 'demo'))
      .orderBy(listings.id);
    expect(after).toEqual(before);
  });
});
