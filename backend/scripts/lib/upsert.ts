import { sql } from 'drizzle-orm';
import type { Database } from '../../src/platform/db/client.js';
import { listings, openHouses } from '../../src/platform/db/schema.js';
import type { ListingInsert, OpenHouseInsert } from './normalize-mls.js';

// Deduplicate a batch because PostgreSQL cannot update one conflict target twice
// within the same INSERT. The latest source row wins; UUIDs survive a re-import.
function latest<T extends { source: string; externalId: string }>(rows: T[]): T[] {
  return [
    ...new Map(rows.map((row) => [JSON.stringify([row.source, row.externalId]), row])).values(),
  ];
}

export async function upsertListings(db: Database, rows: ListingInsert[]) {
  if (!rows.length) return [];
  return db
    .insert(listings)
    .values(latest(rows))
    .onConflictDoUpdate({
      target: [listings.source, listings.externalId],
      set: {
        address: sql`excluded.address`,
        city: sql`excluded.city`,
        state: sql`excluded.state`,
        zipcode: sql`excluded.zipcode`,
        price: sql`excluded.price`,
        bedrooms: sql`excluded.bedrooms`,
        bathrooms: sql`excluded.bathrooms`,
        squareFeet: sql`excluded.square_feet`,
        listedAt: sql`excluded.listed_at`,
        photos: sql`excluded.photos`,
        latitude: sql`excluded.latitude`,
        longitude: sql`excluded.longitude`,
        description: sql`excluded.description`,
        propertyType: sql`excluded.property_type`,
        propertySubType: sql`excluded.property_sub_type`,
        yearBuilt: sql`excluded.year_built`,
        lotSizeAcres: sql`excluded.lot_size_acres`,
        parkingSpaces: sql`excluded.parking_spaces`,
        rawData: sql`excluded.raw_data`,
        updatedAt: sql`now()`,
      },
    })
    .returning({ id: listings.id, source: listings.source, externalId: listings.externalId });
}

export async function upsertOpenHouses(db: Database, rows: OpenHouseInsert[]) {
  if (!rows.length) return [];
  return db
    .insert(openHouses)
    .values(latest(rows))
    .onConflictDoUpdate({
      target: [openHouses.source, openHouses.externalId],
      set: {
        listingId: sql`excluded.listing_id`,
        date: sql`excluded.date`,
        startTime: sql`excluded.start_time`,
        endTime: sql`excluded.end_time`,
        timeZone: sql`excluded.time_zone`,
        remarks: sql`excluded.remarks`,
        rawData: sql`excluded.raw_data`,
        updatedAt: sql`now()`,
      },
    })
    .returning({ id: openHouses.id });
}

/**
 * Removes this source's rows that are absent from a complete export, so the database mirrors
 * one snapshot. Open houses go first; listings cascade to any events that remain.
 */
export async function pruneMissing(
  db: Database,
  source: string,
  keep: { listings: string[]; openHouses: string[] },
) {
  return db.transaction(async (tx) => {
    const removedOpenHouses = await tx
      .delete(openHouses)
      .where(
        sql`${openHouses.source} = ${source} AND NOT (${openHouses.externalId} = ANY(${sql.param(keep.openHouses)}::text[]))`,
      )
      .returning({ id: openHouses.id });
    const removedListings = await tx
      .delete(listings)
      .where(
        sql`${listings.source} = ${source} AND NOT (${listings.externalId} = ANY(${sql.param(keep.listings)}::text[]))`,
      )
      .returning({ id: listings.id });
    return { listings: removedListings.length, openHouses: removedOpenHouses.length };
  });
}
