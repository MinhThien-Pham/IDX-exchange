export function parsePhotos(photoValue) {
    if (!photoValue) {
        return [];
    }

    try {
        // Some L_Photos values are malformed JSON, so the raw string is used as a fallback URL.
        const photos = typeof photoValue === 'string' ? JSON.parse(photoValue) : photoValue;

        return Array.isArray(photos)
            ? photos.filter((photo) => typeof photo === 'string' && photo.trim())
            : [];
    } catch {
        if (typeof photoValue === 'string' && /^https?:\/\//i.test(photoValue.trim())) {
            return [photoValue.trim()];
        }

        return [];
    }
}
