import { listingSchema, listingsResponseSchema, type SearchListingsQuery } from '@idx/contracts';
import { request } from '../../../shared/api/client';
import { buildQueryString } from '../../../shared/utils/query-string';

export function fetchListings(query: SearchListingsQuery, signal?: AbortSignal) {
  return request(`/listings?${buildQueryString(query)}`, listingsResponseSchema, signal);
}

export function fetchListing(id: string, signal?: AbortSignal) {
  return request(`/listings/${encodeURIComponent(id)}`, listingSchema, signal);
}
