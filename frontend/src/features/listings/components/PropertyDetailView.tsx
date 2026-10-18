import { useState } from 'react';
import {
  ArrowLeft,
  Bath,
  BedDouble,
  CalendarDays,
  Images,
  MapPin,
  Ruler,
  RotateCcw,
} from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { config } from '../../../shared/config';
import { ApiError } from '../../../shared/api/client';
import {
  formatListingDate,
  formatPrice,
  formatPricePerSquareFoot,
  formatPropertyLocation,
} from '../../../shared/utils/formatting';
import { compactLayoutQuery, useMediaQuery } from '../../../shared/hooks/useMediaQuery';
import { usePageScroll } from '../../../shared/hooks/usePageScroll';
import { useListing } from '../hooks/useListings';
import OpenHouses from '../../open-houses/components/OpenHouses';
import PropertyImageGallery from './PropertyImageGallery';
import PropertyMap from './PropertyMap';
import '../../../pages/PropertyDetailPage.css';

export default function PropertyDetailView() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const query = useListing(id);
  const compact = useMediaQuery(compactLayoutQuery);
  const [photosOpen, setPhotosOpen] = useState(false);
  usePageScroll(!query.isPending);
  const from: unknown = location.state?.from;
  const back = () => {
    if (typeof from === 'string' && /^\/(?:\?|$)/.test(from)) navigate(-1);
    else navigate('/');
  };
  const property = query.data;
  const missing =
    query.error instanceof ApiError && (query.error.status === 404 || query.error.status === 400);
  const facts = property
    ? [
        { value: property.bedrooms, label: 'Bedrooms', Icon: BedDouble },
        { value: property.bathrooms, label: 'Bathrooms', Icon: Bath },
        { value: property.squareFeet, label: 'Square feet', Icon: Ruler },
        { value: property.yearBuilt, label: 'Year built', Icon: CalendarDays },
      ].filter((fact) => fact.value !== null)
    : [];
  const perFoot = property ? formatPricePerSquareFoot(property.price, property.squareFeet) : null;
  return (
    <main id="main-content" className="property-detail-page page-container">
      {!compact && (
        <button type="button" className="button button-quiet back-button" onClick={back}>
          <ArrowLeft aria-hidden="true" />
          Back to listings
        </button>
      )}
      {query.isPending ? (
        <>
          <h1 className="sr-only">Property details</h1>
          <p role="status">Loading property details…</p>
          <div className="detail-loading-skeleton" aria-hidden="true" />
        </>
      ) : query.isError ? (
        <div className="result-state" role="alert">
          <h1>{missing ? 'This listing is unavailable.' : 'Property details couldn’t load.'}</h1>
          <p>
            {missing
              ? 'The link may be incorrect or the property may no longer be included.'
              : query.error.message}
          </p>
          {!missing && (
            <button
              className="button button-primary"
              type="button"
              onClick={() => void query.refetch()}
            >
              <RotateCcw aria-hidden="true" />
              Try again
            </button>
          )}
          {!compact && (
            <button type="button" className="button" onClick={back}>
              Return to results
            </button>
          )}
        </div>
      ) : (
        property && (
          <>
            <header className="detail-header">
              <div className="detail-pricing">
                <span className="detail-price">{formatPrice(property.price)}</span>
                {perFoot && <span className="price-per-foot">{perFoot}</span>}
              </div>
              <h1>{property.address || 'Address unavailable'}</h1>
              <p>{formatPropertyLocation(property)}</p>
            </header>
            <div className="property-image-main">
              <PropertyImageGallery
                key={property.id}
                photos={property.photos}
                address={property.address}
                open={photosOpen}
                onOpen={() => setPhotosOpen(true)}
                onClose={() => setPhotosOpen(false)}
              />
            </div>
            <div className="property-content">
              {facts.length > 0 && (
                <section className="detail-stats" aria-label="Property facts">
                  {facts.map(({ value, label, Icon }) => (
                    <div key={label}>
                      <strong>
                        {label === 'Year built' ? value : value?.toLocaleString('en-US')}
                      </strong>
                      <span>
                        <Icon aria-hidden="true" />
                        {label}
                      </span>
                    </div>
                  ))}
                </section>
              )}
              <aside className="property-sidebar">
                <OpenHouses listingId={id} />
              </aside>
              <div className="property-main">
                {facts.length < 4 && (
                  <p className="missing-details-note">Some property details were not provided.</p>
                )}
                <section className="detail-section">
                  <h2>Take a closer look</h2>
                  <p className="detail-description">
                    {property.description || 'No property description was provided.'}
                  </p>
                </section>
                <section className="detail-section">
                  <h2>Property details</h2>
                  <dl className="detail-definition">
                    {[
                      ['Property type', property.propertyType],
                      ['Property subtype', property.propertySubType],
                      [
                        'Lot size',
                        property.lotSizeAcres !== null ? `${property.lotSizeAcres} acres` : null,
                      ],
                      ['Parking spaces', property.parkingSpaces],
                      ['Listing ID', property.externalId],
                      ['Listed', property.listedAt ? formatListingDate(property.listedAt) : null],
                    ]
                      .filter(([, value]) => value !== null && value !== '')
                      .map(([label, value]) => (
                        <div key={label}>
                          <dt>{label}</dt>
                          <dd>{value}</dd>
                        </div>
                      ))}
                  </dl>
                </section>
                <section className="detail-section">
                  <h2>The location</h2>
                  <p className="detail-location-line">
                    <MapPin aria-hidden="true" />
                    <span>
                      {property.address}
                      <small>{formatPropertyLocation(property)}</small>
                    </span>
                  </p>
                  {property.latitude !== null && property.longitude !== null && (
                    <PropertyMap
                      lat={property.latitude}
                      lng={property.longitude}
                      address={property.address}
                      apiKey={config.googleMapsApiKey}
                    />
                  )}
                </section>
              </div>
            </div>
          </>
        )
      )}
      {compact && (
        <div className="mobile-dock detail-dock" role="region" aria-label="Property actions">
          <button type="button" className="button button-primary" onClick={back}>
            <ArrowLeft aria-hidden="true" />
            Back to listings
          </button>
          {property && !query.isError && (
            <button
              type="button"
              className="button"
              disabled={!property.photos.length}
              onClick={() => setPhotosOpen(true)}
            >
              <Images aria-hidden="true" />
              Photos
            </button>
          )}
        </div>
      )}
    </main>
  );
}
