import './PropertyCard.css';

function getFirstPhoto(photoValue) {
    if (!photoValue) {
        return null;
    }

    try {
        const photos = typeof photoValue === 'string'
            ? JSON.parse(photoValue)
            : photoValue;

        if (Array.isArray(photos) && photos.length > 0 && photos[0]) {
            return photos[0];
        }

        return null;
    } catch (error) {
        return null;
    }
}

function formatPrice(price) {
    const numberPrice = Number(price);

    if (Number.isNaN(numberPrice)) {
        return 'Price unavailable';
    }

    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
    }).format(numberPrice);
}

function PropertyCard({ property }) {
    const firstPhoto = getFirstPhoto(property.L_Photos);

    return (
        <div className="property-card">
            <div className="property-image-wrapper">
                {firstPhoto ? (
                    <img
                        src={firstPhoto}
                        alt={property.L_Address || 'Property'}
                        className="property-image"
                    />
                ) : (
                    <div className="property-image-placeholder">
                        No Photo Available
                    </div>
                )}
            </div>

            <div className="property-card-content">
                <h2 className="property-price">
                    {formatPrice(property.L_SystemPrice)}
                </h2>

                <p className="property-address">
                    {property.L_Address || 'Address unavailable'}
                </p>

                <p className="property-location">
                    {property.L_City || 'Unknown City'}, {property.L_State || 'Unknown State'}
                </p>

                <div className="property-stats">
                    <span>{property.L_Keyword2 ?? 'N/A'} beds</span>
                    <span>{property.LM_Dec_3 ?? 'N/A'} baths</span>
                    <span>{property.LM_Int2_3 ?? 'N/A'} sqft</span>
                </div>
            </div>
        </div>
    );
}

export default PropertyCard;