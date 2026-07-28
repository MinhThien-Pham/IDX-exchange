const API_BASE = '';

function buildQueryString(params = {}) {
    const cleanParams = {};

    Object.keys(params).forEach((key) => {
        const value = params[key];

        if (value !== undefined && value !== null && value !== '') {
            cleanParams[key] = value;
        }
    });

    return new URLSearchParams(cleanParams).toString();
}

export async function fetchProperties(params = {}) {
    try {
        const query = buildQueryString(params);
        const url = `${API_BASE}/api/properties${query ? `?${query}` : ''}`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

export async function fetchPropertyDetail(listingId) {
    try {
        const response = await fetch(`${API_BASE}/api/properties/${listingId}`);

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Property not found');
            }

            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

export async function fetchOpenHouses(listingId) {
    try {
        const response = await fetch(`${API_BASE}/api/properties/${listingId}/openhouses`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

export { buildQueryString };