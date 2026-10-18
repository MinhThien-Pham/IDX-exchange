import { ArrowUpRight, Bath, BedDouble, Images, Ruler } from 'lucide-react';
import { type ListingDto } from '@idx/contracts';
import { Link, useLocation } from 'react-router-dom';
import {
  formatListingDate,
  formatPrice,
  formatPricePerSquareFoot,
  formatPropertyLocation,
} from '../../../shared/utils/formatting';
import './PropertyCard.css';
import PropertyImage from '../../../shared/ui/PropertyImage';

export default function PropertyCard({ property }: { property: ListingDto }) {
  const location = useLocation();
  const perFoot = formatPricePerSquareFoot(property.price, property.squareFeet);
  return (
    <article className="property-card">
      <Link
        className="property-card-link"
        to={`/property/${encodeURIComponent(property.id)}`}
        state={{ from: `${location.pathname}${location.search}` }}
        aria-label={`View ${property.address || 'property'}`}
      >
        <div className="property-card-photo">
          <PropertyImage
            src={property.photos[0]}
            alt={`Exterior of ${property.address || 'property'}`}
          />
          {property.propertyType && <span className="property-tag">{property.propertyType}</span>}
          {property.photos.length > 0 && (
            <span className="property-photo-count" aria-label={`${property.photos.length} photos`}>
              <Images aria-hidden="true" />
              {property.photos.length}
            </span>
          )}
        </div>
        <div className="property-card-content">
          <div className="property-pricing">
            <span className="property-price">{formatPrice(property.price)}</span>
            {perFoot && <span className="price-per-foot">{perFoot}</span>}
          </div>
          <div className="property-stats">
            {property.bedrooms !== null && (
              <span>
                <BedDouble aria-hidden="true" />
                <strong>{property.bedrooms}</strong> beds
              </span>
            )}
            {property.bathrooms !== null && (
              <span>
                <Bath aria-hidden="true" />
                <strong>{property.bathrooms}</strong> baths
              </span>
            )}
            {property.squareFeet !== null && (
              <span>
                <Ruler aria-hidden="true" />
                <strong>{property.squareFeet.toLocaleString('en-US')}</strong> sqft
              </span>
            )}
          </div>
          <h3 className="property-address">{property.address || 'Address unavailable'}</h3>
          <p className="property-location">{formatPropertyLocation(property)}</p>
          <div className="property-card-footer">
            <span>
              {property.listedAt
                ? `Listed ${formatListingDate(property.listedAt)}`
                : 'Listing date unavailable'}
            </span>
            <span className="property-card-arrow">
              <ArrowUpRight aria-hidden="true" />
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
