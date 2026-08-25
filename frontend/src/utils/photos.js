export function parsePhotos(photoValue) {
    if (!photoValue) {
        return [];
    }

    try {
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
