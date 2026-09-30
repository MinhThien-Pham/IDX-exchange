import {
  and,
  asc,
  count,
  eq,
  gte,
  inArray,
  isNotNull,
  like,
  lte,
  sql,
  type SQL,
} from 'drizzle-orm';
import { classifyHomeType, homeTypeSourceKeys } from '../domain/home-type.js';
import type {
  ListingRepository,
  ListingSearch,
  ListingSearchResult,
} from '../application/ports/listing-repository.js';
import type { Listing } from '../domain/listing.js';
import type { Database } from '../../../platform/db/client.js';
import { listings } from '../../../platform/db/schema.js';
import { isUuid } from '../../../platform/db/uuid.js';

// Select the public fields explicitly. MLS raw_data never crosses the API boundary.
const selection = {
  id: listings.id,
  source: listings.source,
  externalId: listings.externalId,
  address: listings.address,
  city: listings.city,
  state: listings.state,
  zipcode: listings.zipcode,
  price: listings.price,
  bedrooms: listings.bedrooms,
  bathrooms: listings.bathrooms,
  squareFeet: listings.squareFeet,
  listedAt: listings.listedAt,
  photos: listings.photos,
  latitude: listings.latitude,
  longitude: listings.longitude,
  description: listings.description,
  propertyType: listings.propertyType,
  propertySubType: listings.propertySubType,
  yearBuilt: listings.yearBuilt,
  lotSizeAcres: listings.lotSizeAcres,
  parkingSpaces: listings.parkingSpaces,
};

type SelectedListing = Omit<
  Listing,
  'price' | 'bathrooms' | 'latitude' | 'longitude' | 'lotSizeAcres' | 'homeType'
> & {
  price: string | null;
  bathrooms: string | null;
  latitude: string | null;
  longitude: string | null;
  lotSizeAcres: string | null;
};

function toListing(row: SelectedListing): Listing {
  const number = (value: string | null) => (value === null ? null : Number(value));
  return {
    ...row,
    price: number(row.price),
    bathrooms: number(row.bathrooms),
    latitude: number(row.latitude),
    longitude: number(row.longitude),
    lotSizeAcres: number(row.lotSizeAcres),
    homeType: classifyHomeType(row.propertySubType),
  };
}

export class PostgresListingRepository implements ListingRepository {
  constructor(private readonly db: Database) {}

  async search(query: ListingSearch): Promise<ListingSearchResult> {
    const conditions: SQL[] = [];
    if (query.city !== undefined)
      conditions.push(eq(listings.cityNormalized, query.city.trim().toLowerCase()));
    if (query.zipcode !== undefined) conditions.push(eq(listings.zipcode, query.zipcode));
    if (query.minPrice !== undefined) conditions.push(gte(listings.price, String(query.minPrice)));
    if (query.maxPrice !== undefined) conditions.push(lte(listings.price, String(query.maxPrice)));
    if (query.beds !== undefined) conditions.push(gte(listings.bedrooms, query.beds));
    if (query.baths !== undefined) conditions.push(gte(listings.bathrooms, String(query.baths)));
    if (query.homeType !== undefined) {
      conditions.push(
        inArray(sql`regexp_replace(lower(${listings.propertySubType}), '[^a-z0-9]', '', 'g')`, [
          ...homeTypeSourceKeys(query.homeType),
        ]),
      );
    }

    const sortColumns = {
      price: listings.price,
      listedAt: listings.listedAt,
      squareFeet: listings.squareFeet,
      bedrooms: listings.bedrooms,
    };
    const column = sortColumns[query.sortBy];
    // Only fixed column objects and fixed direction fragments are interpolated.
    const order =
      query.sortOrder === 'ASC' ? sql`${column} ASC NULLS LAST` : sql`${column} DESC NULLS LAST`;
    const where = and(...conditions);

    // Count and page come from one snapshot even while a source import updates rows.
    return this.db.transaction(
      async (tx) => {
        const [totals] = await tx.select({ total: count() }).from(listings).where(where);
        const rows = await tx
          .select(selection)
          .from(listings)
          .where(where)
          .orderBy(order, asc(listings.id))
          .limit(query.limit)
          .offset(query.offset);
        return {
          total: totals?.total ?? 0,
          limit: query.limit,
          offset: query.offset,
          results: rows.map(toListing),
        };
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    );
  }

  async findById(id: string): Promise<Listing | null> {
    if (!isUuid(id)) return null;
    const [row] = await this.db
      .select(selection)
      .from(listings)
      .where(eq(listings.id, id))
      .limit(1);
    return row ? toListing(row) : null;
  }

  async findPropertySubTypes(): Promise<string[]> {
    const rows = await this.db
      .selectDistinct({ value: listings.propertySubType })
      .from(listings)
      .where(isNotNull(listings.propertySubType));
    return rows.flatMap(({ value }) => (value === null ? [] : [value]));
  }

  async suggestCities(prefix: string, limit: number): Promise<string[]> {
    // Escape LIKE metacharacters in addition to parameterizing the query.
    const pattern = `${prefix.replace(/[\\%_]/g, '\\$&')}%`;
    const rows = await this.db
      .select({ city: sql<string>`min(btrim(${listings.city}))` })
      .from(listings)
      .where(like(listings.cityNormalized, pattern))
      .groupBy(listings.cityNormalized)
      .orderBy(asc(listings.cityNormalized))
      .limit(limit);
    return rows.map(({ city }) => city);
  }

  async exists(id: string): Promise<boolean> {
    if (!isUuid(id)) return false;
    const rows = await this.db
      .select({ id: listings.id })
      .from(listings)
      .where(eq(listings.id, id))
      .limit(1);
    return rows.length > 0;
  }
}
