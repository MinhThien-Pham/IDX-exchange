import { searchListingsSchema } from '@idx/contracts';
import { formValues, locationFilters, parseSearchForm } from './search-form';
import { parseListingSearch } from './search-query';

test('location input distinguishes US ZIP and ZIP+4 from city names', () => {
  expect(locationFilters(' 02108 ')).toEqual({ city: undefined, zipcode: '02108' });
  expect(locationFilters('02108-1234')).toEqual({ city: undefined, zipcode: '02108-1234' });
  expect(locationFilters(' San Diego ')).toEqual({ city: 'San Diego', zipcode: undefined });
  expect(locationFilters(' ')).toEqual({ city: undefined, zipcode: undefined });
});

test('applying refinements preserves both location fields from an existing shared URL', () => {
  const query = searchListingsSchema.parse({ city: 'Boston', zipcode: '02108', limit: 2 });
  const parsed = parseSearchForm({ ...formValues(query), baths: '2.5' }, query, true);
  expect(parsed.success && parsed.data).toMatchObject({
    city: 'Boston',
    zipcode: '02108',
    baths: 2.5,
    limit: 2,
  });
});

test('duplicate known URL parameters fail while unrelated campaign parameters are ignored', () => {
  expect(parseListingSearch(new URLSearchParams('city=Boston&city=Miami')).success).toBe(false);
  const parsed = parseListingSearch(new URLSearchParams('zipcode=02108&utm_source=portfolio'));
  expect(parsed.success && parsed.data.zipcode).toBe('02108');
});

test('home types survive URL parsing and remain independent of location and sort drafts', () => {
  const query = searchListingsSchema.parse({
    city: 'Boston',
    homeType: 'single-family',
    offset: 20,
  });
  const parsed = parseSearchForm({ ...formValues(query), homeType: 'condo' }, query, false);
  expect(parsed.success && parsed.data).toMatchObject({
    city: 'Boston',
    homeType: 'condo',
    offset: 0,
  });
  expect(parseListingSearch(new URLSearchParams('homeType=condo&homeType=townhouse')).success).toBe(
    false,
  );
});
