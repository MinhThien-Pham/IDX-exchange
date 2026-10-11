import { useState } from 'react';
import { ArrowLeft, Images, MapPin, RotateCcw } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { config } from '../../../shared/config';
import { ApiError } from '../../../shared/api/client';
import ResultState from '../../../shared/ui/ResultState';
import {
  formatPrice,
  formatPricePerSquareFoot,
  formatPropertyLocation,
} from '../../../shared/utils/formatting';
import { compactLayoutQuery, useMediaQuery } from '../../../shared/hooks/useMediaQuery';
import { usePageScroll } from '../../../shared/hooks/usePageScroll';
import { useListing } from '../hooks/useListings';
import { OpenHouses } from '../../open-houses';
import PropertyImageGallery from './PropertyImageGallery';
import PropertyMap from './PropertyMap';
import { headlineFacts, PropertyDetailsList, PropertyFacts } from './PropertyFacts';
import './PropertyDetailView.css';

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
    // Return through history only when this page was opened from the listings search.
    if (typeof from === 'string' && /^\/(?:\?|$)/.test(from)) navigate(-1);
    else navigate('/');
  };
  const property = query.data;
  // A malformed ID (400) and an absent listing (404) are the same dead link to a visitor.
  const missing =
    query.error instanceof ApiError && (query.error.status === 404 || query.error.status === 400);
  const facts = property ? headlineFacts(property) : [];
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
        <ResultState
          alert
          headingLevel={1}
          title={missing ? 'This listing is unavailable.' : 'Property details couldn’t load.'}
          message={
            missing
              ? 'The link may be incorrect or the property may no longer be included.'
              : query.error.message
          }
        >
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
        </ResultState>
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
              <PropertyFacts facts={facts} />
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
                  <PropertyDetailsList property={property} />
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
