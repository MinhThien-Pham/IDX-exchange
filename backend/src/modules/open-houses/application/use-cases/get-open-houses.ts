import { ApplicationError } from '../../../../shared/errors/application-error.js';
import type { OpenHouse } from '../../domain/open-house.js';
import type {
  ListingExistenceLookup,
  OpenHouseRepository,
} from '../ports/open-house-repository.js';

export class GetOpenHouses {
  constructor(
    private readonly repository: OpenHouseRepository,
    private readonly listings: ListingExistenceLookup,
  ) {}

  async execute(listingId: string): Promise<OpenHouse[]> {
    if (!(await this.listings.exists(listingId))) {
      throw new ApplicationError('not-found', 'LISTING_NOT_FOUND', 'Listing not found.');
    }
    return this.repository.findByListingId(listingId);
  }
}
