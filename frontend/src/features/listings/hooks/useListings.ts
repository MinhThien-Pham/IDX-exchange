import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { type SearchListingsQuery } from '@idx/contracts';
import { fetchListing, fetchListings } from '../api/listings.api';

export function useListings(query: SearchListingsQuery, enabled = true) {
  return useQuery({
    queryKey: ['listings', query],
    queryFn: ({ signal }) => fetchListings(query, signal),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useListing(id: string) {
  return useQuery({
    queryKey: ['listing', id],
    queryFn: ({ signal }) => fetchListing(id, signal),
    enabled: Boolean(id),
  });
}
