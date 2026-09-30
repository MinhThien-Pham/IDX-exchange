import { asc, eq } from 'drizzle-orm';
import type { OpenHouseRepository } from '../application/ports/open-house-repository.js';
import type { OpenHouse } from '../domain/open-house.js';
import type { Database } from '../../../platform/db/client.js';
import { openHouses } from '../../../platform/db/schema.js';
import { isUuid } from '../../../platform/db/uuid.js';

export class PostgresOpenHouseRepository implements OpenHouseRepository {
  constructor(private readonly db: Database) {}

  async findByListingId(listingId: string): Promise<OpenHouse[]> {
    if (!isUuid(listingId)) return [];
    return this.db
      .select({
        id: openHouses.id,
        listingId: openHouses.listingId,
        date: openHouses.date,
        startTime: openHouses.startTime,
        endTime: openHouses.endTime,
        timeZone: openHouses.timeZone,
        remarks: openHouses.remarks,
      })
      .from(openHouses)
      .where(eq(openHouses.listingId, listingId))
      .orderBy(asc(openHouses.date), asc(openHouses.startTime), asc(openHouses.id));
  }
}
