import { useQuery } from '@tanstack/react-query';
import { fetchOpenHouses } from '../api/open-houses.api';

export function useOpenHouses(listingId: string) {
  return useQuery({
    queryKey: ['open-houses', listingId],
    queryFn: ({ signal }) => fetchOpenHouses(listingId, signal),
    enabled: Boolean(listingId),
  });
}
