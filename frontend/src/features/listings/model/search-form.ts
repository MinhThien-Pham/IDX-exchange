import { type ListingFilters, type SearchListingsQuery } from '@idx/contracts';
import { validSearchSchema } from './search-query';

export const sortOptions = [
  ['listedAt:DESC', 'Newest listed'],
  ['listedAt:ASC', 'Oldest listed'],
  ['price:ASC', 'Price: low to high'],
  ['price:DESC', 'Price: high to low'],
  ['squareFeet:DESC', 'Largest first'],
  ['squareFeet:ASC', 'Smallest first'],
  ['bedrooms:DESC', 'Most bedrooms'],
  ['bedrooms:ASC', 'Fewest bedrooms'],
] as const;

export const refinementKeys = ['minPrice', 'maxPrice', 'beds', 'baths', 'homeType'] as const;
export const filterKeys = ['city', 'zipcode', ...refinementKeys] as const;
export type SearchForm = {
  location: string;
  minPrice: string;
  maxPrice: string;
  beds: string;
  baths: string;
  homeType: string;
  sort: string;
};
export function locationText(filters: ListingFilters) {
  return filters.city ?? filters.zipcode ?? '';
}
export function locationFilters(value: string): Pick<ListingFilters, 'city' | 'zipcode'> {
  const text = value.trim();
  return /^\d{5}(?:-\d{4})?$/.test(text)
    ? { city: undefined, zipcode: text }
    : { city: text || undefined, zipcode: undefined };
}
export function sortValue(query: Pick<SearchListingsQuery, 'sortBy' | 'sortOrder'>) {
  return `${query.sortBy}:${query.sortOrder}`;
}
export function sortLabel(query: Pick<SearchListingsQuery, 'sortBy' | 'sortOrder'>) {
  return sortOptions.find(([value]) => value === sortValue(query))?.[1] ?? 'Newest listed';
}
export function sortFields(value: string) {
  const [sortBy, sortOrder] = value.split(':');
  // Validate the UI value before it can change a shareable URL.
  const parsed = validSearchSchema.parse({ sortBy, sortOrder });
  return { sortBy: parsed.sortBy, sortOrder: parsed.sortOrder };
}
export function formValues(query: SearchListingsQuery): SearchForm {
  return {
    location: locationText(query),
    minPrice: String(query.minPrice ?? ''),
    maxPrice: String(query.maxPrice ?? ''),
    beds: String(query.beds ?? ''),
    baths: String(query.baths ?? ''),
    homeType: query.homeType ?? '',
    sort: sortValue(query),
  };
}
export function parseSearchForm(
  values: SearchForm,
  query: SearchListingsQuery,
  includeLocation: boolean,
) {
  const location =
    includeLocation && values.location.trim() !== locationText(query)
      ? locationFilters(values.location)
      : { city: query.city, zipcode: query.zipcode };
  return validSearchSchema.safeParse({
    ...query,
    ...location,
    ...Object.fromEntries(refinementKeys.map((key) => [key, values[key].trim() || undefined])),
    ...(includeLocation ? sortFields(values.sort) : {}),
    offset: 0,
  });
}
