import { formatOpenHouseDate, formatPrice, formatTime } from '../utils/formatting';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { fetchOpenHouses, fetchPropertyDetail } from '../api/client';

import PropertyImageGallery from '../components/PropertyImageGallery';
import PropertyMap from '../components/PropertyMap';

import './PropertyDetailPage.css';

function getOpenHouseRemarks(allData) {
    if (!allData) {
        return '';
    }

    try {
        const parsed = typeof allData === 'string' ? JSON.parse(allData) : allData;

        return parsed?.OpenHouseRemarks || '';
    } catch {
        return '';
    }
}

function PropertyDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const [property, setProperty] = useState(null);
    const [openHouses, setOpenHouses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        async function loadPropertyData() {
            try {
                setLoading(true);
                setError('');

                const [propertyData, openHouseData] = await Promise.all([
                    fetchPropertyDetail(id),
                    fetchOpenHouses(id),
                ]);

                setProperty(propertyData);

                // Our backend returns the array directly.
                setOpenHouses(Array.isArray(openHouseData) ? openHouseData : []);
            } catch (err) {
                setError(err.message || 'Failed to load property details');
            } finally {
                setLoading(false);
            }
        }

        loadPropertyData();
    }, [id]);

    function backToListings() {
        navigate('/', {
            state: {
                listingsState: location.state?.listingsState,
            },
        });
    }

    if (loading) {
        return (
            <main className="property-detail-page">
                <div className="property-detail-shell">
                    <p className="detail-loading">Loading property details...</p>
                </div>
            </main>
        );
    }

    if (error) {
        return (
            <main className="property-detail-page">
                <div className="detail-error">
                    <h1>Unable to load property</h1>
                    <p>{error}</p>

                    <button type="button" onClick={backToListings}>
                        Back to Listings
                    </button>
                </div>
            </main>
        );
    }

    if (!property) {
        return null;
    }

    const hasCoordinates =
        property.LMD_MP_Latitude !== null &&
        property.LMD_MP_Latitude !== undefined &&
        property.LMD_MP_Latitude !== '' &&
        property.LMD_MP_Longitude !== null &&
        property.LMD_MP_Longitude !== undefined &&
        property.LMD_MP_Longitude !== '';

    return (
        <main className="property-detail-page">
            <div className="property-detail-shell">
                <button type="button" className="back-button" onClick={backToListings}>
                    ← Back to Listings
                </button>

                <header className="detail-header">
                    <h1>{formatPrice(property.L_SystemPrice)}</h1>

                    <p className="detail-address">{property.L_Address || 'Address unavailable'}</p>

                    <p className="detail-location">
                        {property.L_City || 'Unknown City'}, {property.L_State || 'Unknown State'}{' '}
                        {property.L_Zip || ''}
                    </p>
                </header>

                <div className="property-image-main">
                    <PropertyImageGallery photos={property.L_Photos} address={property.L_Address} />
                </div>

                <div className="property-content">
                    <div className="property-main">
                        <section className="detail-stats">
                            <div>
                                <strong>{property.L_Keyword2 ?? 'N/A'}</strong>
                                <span>Bedrooms</span>
                            </div>

                            <div>
                                <strong>{property.LM_Dec_3 ?? 'N/A'}</strong>
                                <span>Bathrooms</span>
                            </div>

                            <div>
                                <strong>
                                    {property.LM_Int2_3
                                        ? Number(property.LM_Int2_3).toLocaleString()
                                        : 'N/A'}
                                </strong>
                                <span>Sq Ft</span>
                            </div>

                            <div>
                                <strong>{property.YearBuilt || 'N/A'}</strong>
                                <span>Year Built</span>
                            </div>
                        </section>

                        <section className="detail-section">
                            <h2>Property Details</h2>

                            <div className="detail-grid">
                                {property.PropertyType && (
                                    <div className="detail-item">
                                        <span>Property Type</span>
                                        <strong>{property.PropertyType}</strong>
                                    </div>
                                )}

                                {property.PropertySubType && (
                                    <div className="detail-item">
                                        <span>Property Subtype</span>
                                        <strong>{property.PropertySubType}</strong>
                                    </div>
                                )}

                                {property.LotSizeAcres && (
                                    <div className="detail-item">
                                        <span>Lot Size</span>
                                        <strong>{property.LotSizeAcres} acres</strong>
                                    </div>
                                )}

                                {property.ParkingTotal && (
                                    <div className="detail-item">
                                        <span>Parking Spaces</span>
                                        <strong>{property.ParkingTotal}</strong>
                                    </div>
                                )}

                                <div className="detail-item">
                                    <span>Listing ID</span>
                                    <strong>{property.L_ListingID}</strong>
                                </div>
                            </div>
                        </section>

                        {property.L_Remarks && (
                            <section className="detail-section">
                                <h2>Description</h2>

                                <p className="detail-description">{property.L_Remarks}</p>
                            </section>
                        )}

                        {hasCoordinates && (
                            <section className="detail-section">
                                <h2>Location</h2>

                                <PropertyMap
                                    lat={property.LMD_MP_Latitude}
                                    lng={property.LMD_MP_Longitude}
                                    address={property.L_Address}
                                    apiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}
                                />
                            </section>
                        )}
                    </div>

                    <aside className="property-sidebar">
                        <section className="sidebar-box">
                            <h2>Open Houses</h2>

                            {openHouses.length === 0 ? (
                                <p className="no-open-houses">No open houses scheduled</p>
                            ) : (
                                <div className="open-house-list">
                                    {openHouses.map((openHouse, index) => {
                                        const remarks = getOpenHouseRemarks(openHouse.all_data);

                                        return (
                                            <article
                                                className="open-house-item"
                                                key={`${openHouse.L_ListingID}-${openHouse.OpenHouseDate}-${index}`}
                                            >
                                                <strong>
                                                    {formatOpenHouseDate(openHouse.OpenHouseDate)}
                                                </strong>

                                                <p className="open-house-time">
                                                    {formatTime(openHouse.OH_StartTime)} -{' '}
                                                    {formatTime(openHouse.OH_EndTime)}
                                                </p>

                                                {remarks && (
                                                    <p className="open-house-remarks">{remarks}</p>
                                                )}
                                            </article>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    </aside>
                </div>
            </div>
        </main>
    );
}

export default PropertyDetailPage;
