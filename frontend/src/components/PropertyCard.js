import { useNavigate } from 'react-router-dom';
import PropertyImageCarousel from './PropertyImageCarousel';
import './PropertyCard.css';

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

function PropertyCard({ property, listingsState }) {
    const navigate = useNavigate();

    function openProperty() {
        navigate(`/property/${property.L_ListingID}`, {
            state: {
                listingsState,
            },
        });
    }

    function handleKeyDown(event) {
        if (
            event.target === event.currentTarget &&
            event.key === 'Enter'
        ) {
            openProperty();
        }
    }

    return (
        <div
            className="property-card"
            onClick={openProperty}
            onKeyDown={handleKeyDown}
            role="link"
            tabIndex={0}
            aria-label={`View ${property.L_Address || 'property'}`}
        >
            <div className="property-image-wrapper">
                <PropertyImageCarousel
                    photos={property.L_Photos}
                    address={property.L_Address}
                />
            </div>

            <div className="property-card-content">
                <h2 className="property-price">
                    {formatPrice(property.L_SystemPrice)}
                </h2>

                <p className="property-address">
                    {property.L_Address || 'Address unavailable'}
                </p>

                <p className="property-location">
                    {property.L_City || 'Unknown City'},{' '}
                    {property.L_State || 'Unknown State'}
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