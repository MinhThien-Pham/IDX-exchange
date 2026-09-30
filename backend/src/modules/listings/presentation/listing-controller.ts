import type {
  CitySuggestionsQuery,
  ListingDto,
  ListingsResponse,
  SearchListingsQuery,
} from '@idx/contracts';
import type { RequestHandler } from 'express';
import { asyncHandler } from '../../../platform/http/async-handler.js';
import type { GetListingDetails } from '../application/use-cases/get-listing-details.js';
import type { SearchListings } from '../application/use-cases/search-listings.js';
import type { GetHomeTypes } from '../application/use-cases/get-home-types.js';
import type { SuggestCities } from '../application/use-cases/suggest-cities.js';

export function createListingController(useCases: {
  searchListings: SearchListings;
  getListingDetails: GetListingDetails;
  getHomeTypes: GetHomeTypes;
  suggestCities: SuggestCities;
}): {
  search: RequestHandler;
  details: RequestHandler;
  homeTypes: RequestHandler;
  cities: RequestHandler;
} {
  return {
    homeTypes: asyncHandler(async (_request, response) => {
      response.json(await useCases.getHomeTypes.execute());
    }),
    cities: asyncHandler(async (_request, response) => {
      const { q } = response.locals.query as CitySuggestionsQuery;
      response.json(await useCases.suggestCities.execute(q));
    }),
    search: asyncHandler(async (_request, response) => {
      const result: ListingsResponse = await useCases.searchListings.execute(
        response.locals.query as SearchListingsQuery,
      );
      response.json(result);
    }),
    details: asyncHandler(async (_request, response) => {
      const { id } = response.locals.params as { id: string };
      const listing: ListingDto = await useCases.getListingDetails.execute(id);
      response.json(listing);
    }),
  };
}
