import type { ListingRepository } from './application/ports/listing-repository.js';
import { GetListingDetails } from './application/use-cases/get-listing-details.js';
import { SearchListings } from './application/use-cases/search-listings.js';
import { createListingController } from './presentation/listing-controller.js';
import { createListingRouter } from './presentation/listing-routes.js';

export function createListingsModule(repository: ListingRepository) {
  const controller = createListingController({
    searchListings: new SearchListings(repository),
    getListingDetails: new GetListingDetails(repository),
  });
  return { router: createListingRouter(controller) };
}
