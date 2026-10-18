import { GetListingDetails } from '../src/modules/listings/application/use-cases/get-listing-details.js';
import { SearchListings } from '../src/modules/listings/application/use-cases/search-listings.js';
import { GetOpenHouses } from '../src/modules/open-houses/application/use-cases/get-open-houses.js';
import { createRepositoryMocks, listing, openHouse } from './helpers/fixtures.js';

describe('listing business use cases', () => {
  const query = { limit: 20, offset: 0, sortBy: 'listedAt', sortOrder: 'DESC' } as const;

  it('rejects an inverted price range before touching persistence', () => {
    const { listings } = createRepositoryMocks();
    const search = new SearchListings(listings);
    expect(() => search.execute({ ...query, minPrice: 900_000, maxPrice: 500_000 })).toThrow(
      'Minimum price must not exceed maximum price.',
    );
    expect(listings.search).not.toHaveBeenCalled();
  });

  it('allows equal price boundaries and zero values', async () => {
    const { listings } = createRepositoryMocks();
    const search = new SearchListings(listings);
    const filters = { ...query, minPrice: 0, maxPrice: 0, beds: 0 };
    await expect(search.execute(filters)).resolves.toMatchObject({ results: [listing] });
    expect(listings.search).toHaveBeenCalledWith(filters);
  });

  it('returns a business not-found error when a listing does not exist', async () => {
    const { listings } = createRepositoryMocks();
    listings.findById.mockResolvedValue(null);
    await expect(new GetListingDetails(listings).execute('missing')).rejects.toMatchObject({
      code: 'LISTING_NOT_FOUND',
    });
  });
});

describe('open house business use case', () => {
  it('distinguishes an existing listing with no events from a missing listing', async () => {
    const { listings, openHouses } = createRepositoryMocks();
    const getOpenHouses = new GetOpenHouses(openHouses, listings);
    openHouses.findByListingId.mockResolvedValueOnce([]);
    await expect(getOpenHouses.execute(listing.id)).resolves.toEqual([]);

    listings.exists.mockResolvedValue(false);
    await expect(getOpenHouses.execute('missing')).rejects.toMatchObject({
      code: 'LISTING_NOT_FOUND',
    });
    expect(openHouses.findByListingId).toHaveBeenCalledTimes(1);
  });

  it('retrieves events through the injected repository', async () => {
    const { listings, openHouses } = createRepositoryMocks();
    await expect(new GetOpenHouses(openHouses, listings).execute(listing.id)).resolves.toEqual([
      openHouse,
    ]);
    expect(openHouses.findByListingId).toHaveBeenCalledWith(listing.id);
  });
});
