import './PropertyMap.css';

function PropertyMap({ lat, lng, address, apiKey }) {
    if (!lat || !lng) {
        return null;
    }

    const directionsUrl =
        `https://www.google.com/maps/dir/?api=1&destination=` +
        `${encodeURIComponent(lat)},${encodeURIComponent(lng)}`;

    if (!apiKey) {
        return (
            <div className="map-unavailable">
                <p>Map is not configured.</p>

                <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Get Directions
                </a>
            </div>
        );
    }

    const mapUrl =
        `https://www.google.com/maps/embed/v1/place` +
        `?key=${encodeURIComponent(apiKey)}` +
        `&q=${encodeURIComponent(lat)},${encodeURIComponent(lng)}` +
        `&zoom=15`;

    return (
        <div className="property-map">
            <iframe
                title={`Map of ${address || 'property'}`}
                src={mapUrl}
                className="property-map-frame"
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
            />

            <a
                className="directions-link"
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
            >
                Get Directions
            </a>
        </div>
    );
}

export default PropertyMap;