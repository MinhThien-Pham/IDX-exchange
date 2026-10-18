import { listingSchema, listingsResponseSchema, type SearchListingsQuery } from '@idx/contracts';
import { buildQueryString, request } from '../../../shared/api/client';

export function fetchListings(query: SearchListingsQuery, signal?: AbortSignal) {
  return request(`/listings?${buildQueryString(query)}`, listingsResponseSchema, signal);
}

export function fetchListing(id: string, signal?: AbortSignal) {
  return request(`/listings/${encodeURIComponent(id)}`, listingSchema, signal);
}
