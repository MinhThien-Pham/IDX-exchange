import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { config } from '../../../shared/config';
import { formatPrice } from '../../../shared/utils/formatting';
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
  const from: unknown = location.state?.from;
  const back = () => {
    if (typeof from === 'string' && /^\/(?:\?|$)/.test(from)) navigate(-1);
    else navigate('/');
  };

  if (query.isPending)
    return (
      <main className="property-detail-page">
        <p className="detail-loading" role="status">
          Loading property details...
        </p>
      </main>
    );
  if (query.isError)
    return (
      <main className="property-detail-page">
        <div className="detail-error" role="alert">
          <h1>Unable to load property</h1>
          <p>{query.error.message}</p>
          <button onClick={back}>Back to Listings</button>
        </div>
      </main>
    );

  const property = query.data;
  return (
    <main className="property-detail-page">
      <div className="property-detail-shell">
        <button type="button" className="back-button" onClick={back}>
          ← Back to Listings
        </button>
        <header className="detail-header">
          <h1>{formatPrice(property.price)}</h1>
          <p className="detail-address">{property.address || 'Address unavailable'}</p>
          <p className="detail-location">
            {property.city || 'Unknown City'}, {property.state || 'Unknown State'}{' '}
            {property.zipcode}
          </p>
        </header>
        <div className="property-image-main">
          <PropertyImageGallery
            key={property.id}
            photos={property.photos}
            address={property.address}
          />
        </div>
        <div className="property-content">
          <div className="property-main">
            <section className="detail-stats">
              <div>
                <strong>{property.bedrooms ?? 'N/A'}</strong>
                <span>Bedrooms</span>
              </div>
              <div>
                <strong>{property.bathrooms ?? 'N/A'}</strong>
                <span>Bathrooms</span>
              </div>
              <div>
                <strong>{property.squareFeet?.toLocaleString() ?? 'N/A'}</strong>
                <span>Sq Ft</span>
              </div>
              <div>
                <strong>{property.yearBuilt ?? 'N/A'}</strong>
                <span>Year Built</span>
              </div>
            </section>
            <section className="detail-section">
              <h2>Property Details</h2>
              <div className="detail-grid">
                {property.propertyType && (
                  <div className="detail-item">
                    <span>Property Type</span>
                    <strong>{property.propertyType}</strong>
                  </div>
                )}
                {property.propertySubType && (
                  <div className="detail-item">
                    <span>Property Subtype</span>
                    <strong>{property.propertySubType}</strong>
                  </div>
                )}
                {property.lotSizeAcres !== null && (
                  <div className="detail-item">
                    <span>Lot Size</span>
                    <strong>{property.lotSizeAcres} acres</strong>
                  </div>
                )}
                {property.parkingSpaces !== null && (
                  <div className="detail-item">
                    <span>Parking Spaces</span>
                    <strong>{property.parkingSpaces}</strong>
                  </div>
                )}
                <div className="detail-item">
                  <span>Listing ID</span>
                  <strong>{property.externalId}</strong>
                </div>
              </div>
            </section>
            {property.description && (
              <section className="detail-section">
                <h2>Description</h2>
                <p className="detail-description">{property.description}</p>
              </section>
            )}
            {property.latitude !== null && property.longitude !== null && (
              <section className="detail-section">
                <h2>Location</h2>
                <PropertyMap
                  lat={property.latitude}
                  lng={property.longitude}
                  address={property.address}
                  apiKey={config.googleMapsApiKey}
                />
              </section>
            )}
          </div>
          <aside className="property-sidebar">
            <OpenHouses listingId={id} />
          </aside>
        </div>
      </div>
    </main>
  );
}
