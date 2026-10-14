import { buildQueryString } from './query-string';

test('keeps zero filters and leading ZIP zeroes while omitting absent values', () => {
  expect(
    buildQueryString({ city: '', zipcode: '02108', beds: 0, minPrice: undefined, maxPrice: null }),
  ).toBe('zipcode=02108&beds=0');
});

test('encodes locations without treating punctuation as extra query parameters', () => {
  const params = new URLSearchParams(buildQueryString({ city: 'A&B + C', offset: 0 }));
  expect([...params]).toEqual([
    ['city', 'A&B + C'],
    ['offset', '0'],
  ]);
});
