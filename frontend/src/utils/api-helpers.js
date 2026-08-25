export function buildQueryString(params = {}) {
    const cleanParams = {};

    Object.keys(params).forEach((key) => {
        const value = params[key];

        if (
            value !== undefined &&
            value !== null &&
            value !== ''
        ) {
            cleanParams[key] = value;
        }
    });

    return new URLSearchParams(cleanParams).toString();
}
