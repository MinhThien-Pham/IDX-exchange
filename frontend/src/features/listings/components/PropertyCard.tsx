import { type ListingDto } from '@idx/contracts';
import { useLocation, useNavigate } from 'react-router-dom';
import { formatPrice } from '../../../shared/utils/formatting';
import PropertyImageCarousel from './PropertyImageCarousel';
import './PropertyCard.css';

export default function PropertyCard({ property }: { property: ListingDto }) {
  const navigate = useNavigate();
  const location = useLocation();
  const openProperty = () =>
    navigate(`/property/${encodeURIComponent(property.id)}`, {
      state: { from: `${location.pathname}${location.search}` },
    });

  return (
    <div
      className="property-card"
      role="link"
      tabIndex={0}
      aria-label={`View ${property.address || 'property'}`}
      onClick={openProperty}
      onKeyDown={(event) => {
        if (event.target === event.currentTarget && event.key === 'Enter') openProperty();
      }}
    >
      <div className="property-image-wrapper">
        <PropertyImageCarousel photos={property.photos} address={property.address} />
      </div>
      <div className="property-card-content">
        <h2 className="property-price">{formatPrice(property.price)}</h2>
        <p className="property-address">{property.address || 'Address unavailable'}</p>
        <p className="property-location">
          {property.city || 'Unknown City'}, {property.state || 'Unknown State'}
        </p>
        <div className="property-stats">
          <span>{property.bedrooms ?? 'N/A'} beds</span>
          <span>{property.bathrooms ?? 'N/A'} baths</span>
          <span>{property.squareFeet ?? 'N/A'} sqft</span>
        </div>
      </div>
    </div>
  );
}
