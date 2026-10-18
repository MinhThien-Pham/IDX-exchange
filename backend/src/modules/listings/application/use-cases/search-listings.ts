import { ApplicationError } from '../../../../shared/errors/application-error.js';
import type {
  ListingRepository,
  ListingSearch,
  ListingSearchResult,
} from '../ports/listing-repository.js';

export class SearchListings {
  constructor(private readonly repository: ListingRepository) {}

  execute(query: ListingSearch): Promise<ListingSearchResult> {
    if (
      query.minPrice !== undefined &&
      query.maxPrice !== undefined &&
      query.minPrice > query.maxPrice
    ) {
      throw new ApplicationError(
        'INVALID_SEARCH_RANGE',
        'Minimum price must not exceed maximum price.',
      );
    }

    return this.repository.search(query);
  }
}
