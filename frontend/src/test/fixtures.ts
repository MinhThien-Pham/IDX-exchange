import { type ListingDto } from '@idx/contracts';

export const listing: ListingDto = {
  id: '1001',
  source: 'demo',
  externalId: '1001',
  address: '123 Canon Drive',
  city: 'Beverly Hills',
  state: 'CA',
  zipcode: '90210',
  price: 900000,
  bedrooms: 3,
  bathrooms: 2.5,
  squareFeet: 1800,
  listedAt: '2026-10-01',
  photos: ['https://example.com/one.jpg', 'https://example.com/two.jpg'],
  latitude: 34.0736,
  longitude: -118.4004,
  description: 'A welcoming home.',
  propertyType: 'Residential',
  propertySubType: 'Single Family',
  yearBuilt: 2000,
  lotSizeAcres: 0.2,
  parkingSpaces: 2,
};

export function mockJsonResponse(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}
