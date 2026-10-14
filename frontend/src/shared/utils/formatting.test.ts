import { formatPricePerSquareFoot, formatPropertyLocation, formatListingDate } from './formatting';

test.each([
  [null, 100],
  [100, null],
  [100, 0],
  [0, 100],
  [NaN, 100],
  [100, Infinity],
])('does not invent price per sqft for price %s and area %s', (price, area) => {
  expect(formatPricePerSquareFoot(price, area)).toBeNull();
});
test('derived prices and incomplete addresses remain readable', () => {
  expect(formatPricePerSquareFoot(900000, 1800)).toBe('$500/sqft');
  expect(formatPropertyLocation({ city: '', state: 'CA', zipcode: '' })).toBe('CA');
  expect(formatPropertyLocation({ city: '', state: '', zipcode: '' })).toBe('Location unavailable');
  expect(formatListingDate('invalid')).toBe('Date unavailable');
});
