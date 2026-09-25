import { sql } from 'drizzle-orm';
import {
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const listings = pgTable(
  'listings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    source: text('source').notNull(),
    externalId: text('external_id').notNull(),
    address: text('address').notNull().default(''),
    city: text('city').notNull().default(''),
    cityNormalized: text('city_normalized').generatedAlwaysAs(sql`lower(btrim(city))`),
    state: text('state').notNull().default(''),
    zipcode: text('zipcode').notNull().default(''),
    price: numeric('price', { precision: 14, scale: 2 }),
    bedrooms: integer('bedrooms'),
    bathrooms: numeric('bathrooms', { precision: 5, scale: 1 }),
    squareFeet: integer('square_feet'),
    listedAt: date('listed_at', { mode: 'string' }),
    photos: text('photos')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    latitude: numeric('latitude', { precision: 18, scale: 15 }),
    longitude: numeric('longitude', { precision: 19, scale: 15 }),
    description: text('description').notNull().default(''),
    propertyType: text('property_type'),
    propertySubType: text('property_sub_type'),
    yearBuilt: integer('year_built'),
    lotSizeAcres: numeric('lot_size_acres', { precision: 14, scale: 4 }),
    parkingSpaces: integer('parking_spaces'),
    rawData: jsonb('raw_data').$type<Record<string, unknown>>().notNull().default({}),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('listings_source_external_id_unique').on(table.source, table.externalId),
    index('listings_city_normalized_idx').on(table.cityNormalized),
    index('listings_city_prefix_idx').on(table.cityNormalized.op('text_pattern_ops')),
    index('listings_home_type_idx').on(
      sql`regexp_replace(lower(${table.propertySubType}), '[^a-z0-9]', '', 'g')`,
    ),
    index('listings_zipcode_idx').on(table.zipcode),
    index('listings_price_id_idx').on(table.price.asc().nullsLast(), table.id.asc()),
    index('listings_listed_at_id_idx').on(table.listedAt.desc().nullsLast(), table.id.asc()),
    check('listings_source_nonempty', sql`length(btrim(${table.source})) > 0`),
    check('listings_external_id_nonempty', sql`length(btrim(${table.externalId})) > 0`),
    check('listings_price_nonnegative', sql`${table.price} >= 0`),
    check('listings_bedrooms_nonnegative', sql`${table.bedrooms} >= 0`),
    check('listings_bathrooms_nonnegative', sql`${table.bathrooms} >= 0`),
    check('listings_square_feet_nonnegative', sql`${table.squareFeet} >= 0`),
    check('listings_lot_size_nonnegative', sql`${table.lotSizeAcres} >= 0`),
    check('listings_parking_nonnegative', sql`${table.parkingSpaces} >= 0`),
    check('listings_year_built_valid', sql`${table.yearBuilt} BETWEEN 1 AND 9999`),
    check('listings_latitude_range', sql`${table.latitude} BETWEEN -90 AND 90`),
    check('listings_longitude_range', sql`${table.longitude} BETWEEN -180 AND 180`),
  ],
);

export const openHouses = pgTable(
  'open_houses',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    listingId: uuid('listing_id')
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    source: text('source').notNull(),
    externalId: text('external_id').notNull(),
    date: date('date', { mode: 'string' }).notNull(),
    startTime: time('start_time', { precision: 0 }),
    endTime: time('end_time', { precision: 0 }),
    timeZone: text('time_zone').notNull(),
    remarks: text('remarks').notNull().default(''),
    rawData: jsonb('raw_data').$type<Record<string, unknown>>().notNull().default({}),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('open_houses_source_external_id_unique').on(table.source, table.externalId),
    index('open_houses_listing_date_time_idx').on(
      table.listingId,
      table.date,
      table.startTime,
      table.id,
    ),
    check('open_houses_source_nonempty', sql`length(btrim(${table.source})) > 0`),
    check('open_houses_external_id_nonempty', sql`length(btrim(${table.externalId})) > 0`),
    check('open_houses_time_zone_nonempty', sql`length(btrim(${table.timeZone})) > 0`),
  ],
);
