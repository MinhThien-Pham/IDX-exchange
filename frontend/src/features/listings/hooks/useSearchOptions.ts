import { useQuery } from '@tanstack/react-query';
import { useDebouncedValue } from '../../../shared/hooks/useDebouncedValue';
import { fetchCitySuggestions, fetchHomeTypes } from '../api/search-options.api';

export function useHomeTypes(enabled = true) {
  return useQuery({
    queryKey: ['home-types'],
    queryFn: ({ signal }) => fetchHomeTypes(signal),
    staleTime: 5 * 60_000,
    enabled,
  });
}

export function useCitySuggestions(value: string, enabled: boolean) {
  const prefix = value.trim().toLowerCase();
  const debounced = useDebouncedValue(prefix);
  return useQuery({
    queryKey: ['city-suggestions', prefix],
    queryFn: ({ signal }) => fetchCitySuggestions(prefix, signal),
    enabled: enabled && prefix.length > 0 && prefix === debounced,
    staleTime: 5 * 60_000,
    retry: false,
  });
}
