import { and, asc, count, eq, gte, lte, sql, type SQL } from 'drizzle-orm';
import type {
  ListingRepository,
  ListingSearch,
  ListingSearchResult,
} from '../application/ports/listing-repository.js';
import type { Listing } from '../domain/listing.js';
import type { Database } from '../../../platform/db/client.js';
import { listings } from '../../../platform/db/schema.js';

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
  'price' | 'bathrooms' | 'latitude' | 'longitude' | 'lotSizeAcres'
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
  };
}

const isUuid = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

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
