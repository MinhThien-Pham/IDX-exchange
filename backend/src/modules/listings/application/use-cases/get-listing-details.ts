import { ApplicationError } from '../../../../shared/errors/application-error.js';
import type { Listing } from '../../domain/listing.js';
import type { ListingRepository } from '../ports/listing-repository.js';

export class GetListingDetails {
  constructor(private readonly repository: ListingRepository) {}

  async execute(id: string): Promise<Listing> {
    const listing = await this.repository.findById(id);
    if (!listing) {
      throw new ApplicationError('not-found', 'LISTING_NOT_FOUND', 'Listing not found.');
    }
    return listing;
  }
}
