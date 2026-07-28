import { buildQueryString, fetchProperties } from './client';

global.fetch = jest.fn();

describe('fetchProperties', () => {
    beforeEach(() => {
        fetch.mockClear();
    });

    test('fetches properties successfully', async () => {
        const mockResponse = {
            total: 100,
            limit: 20,
            offset: 0,
            results: [
                {
                    L_ListingID: '123',
                    L_City: 'Beverly Hills',
                    L_SystemPrice: 500000,
                },
            ],
        };

        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockResponse,
        });

        const data = await fetchProperties({ limit: 20 });

        expect(fetch).toHaveBeenCalledWith('/api/properties?limit=20');
        expect(data).toEqual(mockResponse);
    });

    test('throws error on failed request', async () => {
        fetch.mockResolvedValueOnce({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
        });

        await expect(fetchProperties()).rejects.toThrow('HTTP 500');
    });

    test('builds query string correctly with multiple params', async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ results: [] }),
        });

        await fetchProperties({
            city: 'Beverly Hills',
            minPrice: 300000,
            beds: 3,
        });

        const callUrl = fetch.mock.calls[0][0];

        expect(callUrl).toContain('city=Beverly+Hills');
        expect(callUrl).toContain('minPrice=300000');
        expect(callUrl).toContain('beds=3');
    });

    test('removes empty values from query string', () => {
        const query = buildQueryString({
            city: '',
            zipcode: '',
            minPrice: 300000,
            maxPrice: '',
            beds: 3,
        });

        expect(query).toContain('minPrice=300000');
        expect(query).toContain('beds=3');
        expect(query).not.toContain('city=');
        expect(query).not.toContain('zipcode=');
        expect(query).not.toContain('maxPrice=');
    });
});