import type { ListingDto, ListingsResponse, SearchListingsQuery } from '@idx/contracts';
import type { RequestHandler } from 'express';
import { asyncHandler } from '../../../platform/http/async-handler.js';
import type { GetListingDetails } from '../application/use-cases/get-listing-details.js';
import type { SearchListings } from '../application/use-cases/search-listings.js';

export function createListingController(useCases: {
  searchListings: SearchListings;
  getListingDetails: GetListingDetails;
}): { search: RequestHandler; details: RequestHandler } {
  return {
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
