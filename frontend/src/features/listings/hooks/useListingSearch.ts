import {
  searchListingsSchema,
  type ListingFilters,
  type SearchListingsQuery,
} from '@idx/contracts';
import { useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType, useSearchParams } from 'react-router-dom';
import { buildQueryString } from '../../../shared/api/client';
import { parseListingSearch } from '../model/search-query';

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

  function commit(
    nextQuery: SearchListingsQuery,
    serialized = buildQueryString(nextQuery),
    scrollY = 0,
  ) {
    // Compose rapid commands synchronously, before React commits the next URL.
    draft.current.query = nextQuery;
    draft.current.latestSearch = serialized ? `?${serialized}` : '';
    draft.current.pendingSearches.add(draft.current.latestSearch);
    setParams(serialized, { state: { scrollY } });
  }

  const { city, zipcode, minPrice, maxPrice, beds, baths } = query;
  const filters: ListingFilters = { city, zipcode, minPrice, maxPrice, beds, baths };

  function update(changes: Partial<SearchListingsQuery>, scrollY = window.scrollY) {
    commit({ ...draft.current.query, ...changes }, undefined, scrollY);
  }

  function search(
    nextFilters: ListingFilters,
    sorting?: Pick<SearchListingsQuery, 'sortBy' | 'sortOrder'>,
  ) {
    // Replace all filter fields, including those cleared by the user.
    const current = draft.current.query;
    commit({
      ...Object.fromEntries(
        ['city', 'zipcode', 'minPrice', 'maxPrice', 'beds', 'baths'].map((key) => [
          key,
          nextFilters[key as keyof ListingFilters],
        ]),
      ),
      limit: current.limit,
      offset: 0,
      sortBy: current.sortBy,
      sortOrder: current.sortOrder,
      ...sorting,
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
