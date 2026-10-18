import { listingSchema } from '@idx/contracts';
import { buildQueryString, request } from './client';
import { listing, mockJsonResponse } from '../../test/fixtures';

const fetchMock = jest.fn<Promise<Response>, Parameters<typeof fetch>>();
beforeEach(() => {
  global.fetch = fetchMock;
});

test('parses a normalized API response and forwards the cancellation signal', async () => {
  fetchMock.mockResolvedValueOnce(mockJsonResponse(listing));
  const signal = new AbortController().signal;
  await expect(request('/listings/1001', listingSchema, signal)).resolves.toEqual(listing);
  expect(fetchMock).toHaveBeenCalledWith('/api/v1/listings/1001', { signal });
});

test('preserves the server error code and request ID', async () => {
  fetchMock.mockResolvedValueOnce(
    mockJsonResponse(
      { error: { code: 'NOT_FOUND', message: 'Listing not found' }, requestId: 'request-123' },
      404,
    ),
  );
  await expect(request('/listings/missing', listingSchema)).rejects.toMatchObject({
    message: 'Listing not found',
    code: 'NOT_FOUND',
    status: 404,
    requestId: 'request-123',
  });
});

test('handles a proxy error without exposing a response body', async () => {
  fetchMock.mockResolvedValueOnce({
    ok: false,
    status: 502,
    json: async () => {
      throw new Error('HTML response');
    },
  } as unknown as Response);
  await expect(request('/listings/1001', listingSchema)).rejects.toThrow(
    'Request failed (HTTP 502)',
  );
});

test('rejects successful responses that violate the shared contract', async () => {
  fetchMock.mockResolvedValueOnce(mockJsonResponse({ L_ListingID: 'legacy' }));
  await expect(request('/listings/1001', listingSchema)).rejects.toMatchObject({
    code: 'INVALID_RESPONSE',
  });
});

test('serializes valid zero filters while skipping empty values', () => {
  expect(buildQueryString({ city: '', zipcode: '02108', beds: 0, minPrice: undefined })).toBe(
    'zipcode=02108&beds=0',
  );
});
