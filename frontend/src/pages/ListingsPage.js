import { useEffect, useState } from 'react';
import { fetchProperties } from '../api/client';
import PropertyCard from '../components/PropertyCard';
import './ListingsPage.css';

function ListingsPage() {
    const [properties, setProperties] = useState([]);
    const [total, setTotal] = useState(0);
    const [limit] = useState(20);
    const [offset] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadProperties();
    }, []);

    async function loadProperties() {
        try {
            setLoading(true);
            setError('');

            const data = await fetchProperties({
                limit,
                offset,
            });

            setProperties(data.results || []);
            setTotal(data.total || 0);
        } catch (err) {
            setError('Failed to load properties. Please make sure the backend server is running.');
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <main className="listings-page">
                <p className="loading-message">Loading properties...</p>
            </main>
        );
    }

    if (error) {
        return (
            <main className="listings-page">
                <div className="error-box">
                    <h1>Unable to load properties</h1>
                    <p>{error}</p>
                    <button onClick={loadProperties}>Try Again</button>
                </div>
            </main>
        );
    }

    return (
        <main className="listings-page">
            <header className="listings-header">
                <h1>Property Listings</h1>
                <p>
                    Showing {properties.length} of {total} properties
                </p>
            </header>

            <section className="property-grid">
                {properties.map((property) => (
                    <PropertyCard
                        key={property.L_ListingID}
                        property={property}
                    />
                ))}
            </section>
        </main>
    );
}

export default ListingsPage;