import request from 'supertest';
import { createApp } from '../src/create-app.js';
import type { Logger } from '../src/platform/logging/logger.js';
import { createRepositoryMocks, listing, openHouse } from './helpers/fixtures.js';

function setup() {
  const { listings, openHouses } = createRepositoryMocks();
  const readiness = jest.fn<Promise<void>, []>().mockResolvedValue(undefined);
  const logger: jest.Mocked<Logger> = { info: jest.fn(), error: jest.fn() };
  const app = createApp({
    listingRepository: listings,
    openHouseRepository: openHouses,
    allowedOrigins: ['http://localhost:5173'],
    readiness,
    logger,
  });
  return { app, listings, openHouses, readiness, logger };
}

describe('listing HTTP API', () => {
  it('serves OpenAPI schemas from the shared runtime contracts', async () => {
    const { app } = setup();
    const response = await request(app).get('/api/openapi.json');
    expect(response.status).toBe(200);
    expect(response.body.openapi).toBe('3.1.0');
    expect(response.body.components.schemas.Listing.properties).toHaveProperty('externalId');
    expect(response.body.components.schemas.Listing.properties).not.toHaveProperty('rawData');
    expect(response.body.paths['/api/v1/listings'].get.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'limit',
          required: false,
          schema: expect.objectContaining({ default: 20, maximum: 100 }),
        }),
      ]),
    );
  });

  it('parses filters and applies stable pagination/sort defaults', async () => {
    const { app, listings } = setup();
    const response = await request(app).get('/api/v1/listings?city=Pasadena&baths=2.5');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ total: 1, limit: 20, offset: 0, results: [listing] });
    expect(listings.search).toHaveBeenCalledWith({
      city: 'Pasadena',
      baths: 2.5,
      limit: 20,
      offset: 0,
      sortBy: 'listedAt',
      sortOrder: 'DESC',
    });
  });

  it.each([
    'limit=101',
    'offset=-1',
    'beds=2.5',
    'baths=Infinity',
    'minPrice=',
    'minPrice=%20',
    'limit=1&limit=2',
    'sortBy=L_SystemPrice',
    'unknown=value',
  ])('rejects invalid query %s without accessing the database', async (query) => {
    const { app, listings } = setup();
    const response = await request(app).get(`/api/v1/listings?${query}`);
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(listings.search).not.toHaveBeenCalled();
  });

  it('maps a business price-range failure to a client error', async () => {
    const { app, listings } = setup();
    const response = await request(app).get('/api/v1/listings?minPrice=100&maxPrice=50');
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_SEARCH_RANGE');
    expect(listings.search).not.toHaveBeenCalled();
  });

  it('provides search choices through static routes before the listing-ID route', async () => {
    const { app, listings } = setup();
    const types = await request(app).get('/api/v1/listings/home-types');
    expect(types.status).toBe(200);
    expect(types.body).toEqual([
      { value: 'single-family', label: 'Single-family' },
      { value: 'condo', label: 'Condo' },
    ]);
    const cities = await request(app).get('/api/v1/listings/cities?q=%20Bos%20');
    expect(cities.status).toBe(200);
    expect(cities.body).toEqual(['Boston']);
    expect(listings.suggestCities).toHaveBeenCalledWith('bos', 8);
    expect(listings.findById).not.toHaveBeenCalled();
  });

  it.each(['', '?q=', '?q=Bos&q=Pas', '?q=Bos&limit=10000'])(
    'rejects invalid city suggestions query %s',
    async (query) => {
      const { app, listings } = setup();
      expect((await request(app).get(`/api/v1/listings/cities${query}`)).status).toBe(400);
      expect(listings.suggestCities).not.toHaveBeenCalled();
    },
  );

  it('validates the canonical home-type key before passing it to the use case', async () => {
    const { app, listings } = setup();
    expect((await request(app).get('/api/v1/listings?homeType=single-family')).status).toBe(200);
    expect(listings.search).toHaveBeenCalledWith(
      expect.objectContaining({ homeType: 'single-family' }),
    );
    expect(
      (await request(app).get('/api/v1/listings?homeType=condo&homeType=townhouse')).status,
    ).toBe(400);
  });

  it('returns canonical detail and open-house data', async () => {
    const { app } = setup();
    const detail = await request(app).get(`/api/v1/listings/${listing.id}`);
    const events = await request(app).get(`/api/v1/listings/${listing.id}/openhouses`);
    expect(detail.status).toBe(200);
    expect(detail.body).toEqual(listing);
    expect(events.status).toBe(200);
    expect(events.body).toEqual([openHouse]);
  });

  it('returns a structured 404 for a missing listing', async () => {
    const { app, listings } = setup();
    listings.findById.mockResolvedValue(null);
    const response = await request(app).get(
      '/api/v1/listings/00000000-0000-4000-8000-000000000000',
    );
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('LISTING_NOT_FOUND');
  });

  it.each(['invalid%20id', 'DEMO-001', '1001'])(
    'rejects non-UUID listing ID %s before calling a use case',
    async (id) => {
      const { app, listings } = setup();
      const detail = await request(app).get(`/api/v1/listings/${id}`);
      const events = await request(app).get(`/api/v1/listings/${id}/openhouses`);
      expect(detail.status).toBe(400);
      expect(events.status).toBe(400);
      expect(detail.body.error.code).toBe('VALIDATION_ERROR');
      expect(listings.findById).not.toHaveBeenCalled();
      expect(listings.exists).not.toHaveBeenCalled();
    },
  );

  it('returns a client error for malformed URL encoding', async () => {
    const { app, listings } = setup();
    const response = await request(app).get('/api/v1/listings/%ZZ');
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_PATH');
    expect(listings.findById).not.toHaveBeenCalled();
  });

  it('forwards rejected handlers once and never exposes database errors', async () => {
    const { app, listings, logger } = setup();
    listings.search.mockRejectedValue(
      new Error('postgresql://secret:password@private/db SELECT *'),
    );
    const response = await request(app).get('/api/v1/listings');
    expect(response.status).toBe(500);
    expect(response.body.error).toEqual({
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred.',
    });
    expect(JSON.stringify(response.body)).not.toContain('password');
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain('password');
    expect(logger.error).toHaveBeenCalledTimes(1);
  });
});

describe('HTTP middleware and operational endpoints', () => {
  it('returns JSON for unmatched routes with a matching request ID', async () => {
    const { app } = setup();
    const response = await request(app).get('/does-not-exist');
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('ROUTE_NOT_FOUND');
    expect(response.body.requestId).toBe(response.headers['x-request-id']);
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('allows configured browser origins and server-to-server requests', async () => {
    const { app } = setup();
    const browser = await request(app)
      .get('/api/v1/listings')
      .set('Origin', 'http://localhost:5173');
    expect(browser.status).toBe(200);
    expect(browser.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect((await request(app).get('/api/v1/listings')).status).toBe(200);
  });

  it('rejects unlisted origins and does not reflect them', async () => {
    const { app, listings } = setup();
    const response = await request(app)
      .get('/api/v1/listings')
      .set('Origin', 'https://unlisted.example');
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('ORIGIN_NOT_ALLOWED');
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
    expect(listings.search).not.toHaveBeenCalled();
  });

  it('handles preflight requests before invoking application code', async () => {
    const { app, listings } = setup();
    const response = await request(app)
      .options('/api/v1/listings')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'GET');
    expect(response.status).toBe(204);
    expect(listings.search).not.toHaveBeenCalled();
  });

  it('reports readiness failures as sanitized 503 responses while liveness stays available', async () => {
    const { app, readiness } = setup();
    readiness.mockRejectedValue(new Error('connection password=private'));
    const ready = await request(app).get('/api/health');
    const live = await request(app).get('/api/health/live');
    expect(ready.status).toBe(503);
    expect(ready.body.error.code).toBe('SERVICE_UNAVAILABLE');
    expect(JSON.stringify(ready.body)).not.toContain('private');
    expect(live.status).toBe(200);
    expect(readiness).toHaveBeenCalledTimes(1);
  });

  it('returns a connected readiness result', async () => {
    const { app, readiness } = setup();
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok', database: 'connected' });
    expect(readiness).toHaveBeenCalledTimes(1);
  });

  it('handles malformed JSON through the shared error formatter', async () => {
    const { app } = setup();
    const response = await request(app)
      .post('/api/v1/listings')
      .set('Content-Type', 'application/json')
      .send('{broken');
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_JSON');
  });

  it('rejects oversized bodies with a structured error', async () => {
    const { app } = setup();
    const response = await request(app)
      .post('/api/v1/listings')
      .send({ content: 'x'.repeat(33_000) });
    expect(response.status).toBe(413);
    expect(response.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });
});
