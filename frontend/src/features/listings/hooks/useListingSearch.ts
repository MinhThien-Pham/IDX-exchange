import {
  searchListingsSchema,
  type ListingFilters,
  type SearchListingsQuery,
} from '@idx/contracts';
import { useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType, useSearchParams } from 'react-router-dom';
import { buildQueryString } from '../../../shared/api/client';

export const validSearchSchema = searchListingsSchema.refine(
  (value) =>
    value.minPrice === undefined ||
    value.maxPrice === undefined ||
    value.minPrice <= value.maxPrice,
  { message: 'Minimum price must not exceed maximum price.', path: ['maxPrice'] },
);

export function parseListingSearch(params: URLSearchParams) {
  // Ignore unrelated URL parameters while rejecting duplicate known parameters.
  const query: Record<string, unknown> = {};
  for (const key of Object.keys(searchListingsSchema.shape)) {
    const values = params.getAll(key);
    if (values.length > 0) query[key] = values.length === 1 ? values[0] : values;
  }
  return validSearchSchema.safeParse(query);
}

export function useListingSearch() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigationType = useNavigationType();
  const parsed = parseListingSearch(params);
  const query = parsed.success ? parsed.data : searchListingsSchema.parse({});
  const draft = useRef({
    query,
    locationKey: location.key,
    latestSearch: location.search,
    pendingSearches: new Set<string>(),
  });

  useLayoutEffect(() => {
    const current = draft.current;
    if (current.locationKey === location.key) return;
    current.locationKey = location.key;

    // The router can render an earlier push while a newer command is pending.
    // Browser history and external navigation always replace our local draft.
    const isPendingPush = navigationType !== 'POP' && current.pendingSearches.has(location.search);
    if (!isPendingPush || location.search === current.latestSearch) {
      current.query = query;
      current.pendingSearches.clear();
    } else {
      current.pendingSearches.delete(location.search);
    }
  }, [location.key, location.search, navigationType, query]);

  function commit(nextQuery: SearchListingsQuery, serialized = buildQueryString(nextQuery)) {
    // Compose rapid commands synchronously, before React commits the next URL.
    draft.current.query = nextQuery;
    draft.current.latestSearch = serialized ? `?${serialized}` : '';
    draft.current.pendingSearches.add(draft.current.latestSearch);
    setParams(serialized);
  }

  const { city, zipcode, minPrice, maxPrice, beds, baths } = query;
  const filters: ListingFilters = { city, zipcode, minPrice, maxPrice, beds, baths };

  function update(changes: Partial<SearchListingsQuery>) {
    commit({ ...draft.current.query, ...changes });
  }

  function search(nextFilters: ListingFilters) {
    // Replace all filter fields, including those cleared by the user.
    const current = draft.current.query;
    commit({
      ...nextFilters,
      limit: current.limit,
      offset: 0,
      sortBy: current.sortBy,
      sortOrder: current.sortOrder,
    });
  }

  return {
    query,
    filters,
    update,
    search,
    clear: () => commit(searchListingsSchema.parse({}), ''),
    currentPage: Math.floor(query.offset / query.limit) + 1,
    error: parsed.success ? '' : parsed.error.issues.map((issue) => issue.message).join(' '),
  };
}
