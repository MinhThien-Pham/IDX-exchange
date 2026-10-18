import type { OpenHouse } from '../../domain/open-house.js';

export interface OpenHouseRepository {
  findByListingId(listingId: string): Promise<OpenHouse[]>;
}

/** The module only needs existence, not another module's concrete repository. */
export interface ListingExistenceLookup {
  exists(listingId: string): Promise<boolean>;
}
