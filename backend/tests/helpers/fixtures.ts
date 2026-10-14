import type { ListingRepository } from '../../src/modules/listings/application/ports/listing-repository.js';
import type { Listing } from '../../src/modules/listings/domain/listing.js';
import type { OpenHouseRepository } from '../../src/modules/open-houses/application/ports/open-house-repository.js';
import type { OpenHouse } from '../../src/modules/open-houses/domain/open-house.js';

export const listing: Listing = {
  id: '11111111-1111-4111-8111-111111111111',
  source: 'demo',
  externalId: 'DEMO-001',
  address: '123 Example Avenue',
  city: 'Pasadena',
  state: 'CA',
  zipcode: '91101',
  price: 750_000,
  bedrooms: 3,
  bathrooms: 2.5,
  squareFeet: 1_800,
  listedAt: '2026-01-15',
  photos: [],
  latitude: 34.1478,
  longitude: -118.1445,
  description: 'A fictional home for testing.',
  propertyType: 'Residential',
  propertySubType: 'Single Family',
  homeType: { value: 'single-family', label: 'Single-family' },
  yearBuilt: 2000,
  lotSizeAcres: 0.15,
  parkingSpaces: 2,
};

export const openHouse: OpenHouse = {
  id: '22222222-2222-4222-8222-222222222222',
  listingId: listing.id,
  date: '2026-11-15',
  startTime: '13:00:00',
  endTime: '16:00:00',
  timeZone: 'America/Los_Angeles',
  remarks: 'Public viewing.',
};

export function createRepositoryMocks() {
  const listings: jest.Mocked<ListingRepository> = {
    search: jest.fn().mockImplementation(async (query) => ({
      total: 1,
      limit: query.limit,
      offset: query.offset,
      results: [listing],
    })),
    findById: jest.fn().mockResolvedValue(listing),
    exists: jest.fn().mockResolvedValue(true),
    findPropertySubTypes: jest.fn().mockResolvedValue(['SingleFamilyResidence', 'Condominium']),
    suggestCities: jest.fn().mockResolvedValue(['Boston']),
  };
  const openHouses: jest.Mocked<OpenHouseRepository> = {
    findByListingId: jest.fn().mockResolvedValue([openHouse]),
  };
  return { listings, openHouses };
}
