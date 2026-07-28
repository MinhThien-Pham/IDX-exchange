import { useEffect, useRef, useState } from 'react';
import { fetchProperties } from '../api/client';
import PropertyCard from '../components/PropertyCard';
import PropertyFilters from '../components/PropertyFilters';
import './ListingsPage.css';

function ListingsPage() {
    const [properties, setProperties] = useState([]);
    const [total, setTotal] = useState(0);
    const [limit] = useState(20);
    const [offset] = useState(0);
    const [filters, setFilters] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const requestIdRef = useRef(0);

    useEffect(() => {
        loadProperties(filters);
    }, [filters]);

    async function loadProperties(activeFilters = {}) {
        const requestId = requestIdRef.current + 1;
        requestIdRef.current = requestId;

        try {
            setLoading(true);
            setError('');

            const data = await fetchProperties({
                ...activeFilters,
                limit,
                offset,
            });

            if (requestId !== requestIdRef.current) {
                return;
            }

            setProperties(data.results || []);
            setTotal(data.total || 0);
        } catch (err) {
            if (requestId !== requestIdRef.current) {
                return;
            }

            setError('Failed to load properties. Please make sure the backend server is running.');
        } finally {
            if (requestId === requestIdRef.current) {
                setLoading(false);
            }
        }
    }

    function handleSearch(newFilters) {
        setFilters(newFilters);
    }

    function handleClear() {
        setFilters({});
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
                    <button onClick={() => loadProperties(filters)}>Try Again</button>
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

            <PropertyFilters onSearch={handleSearch} onClear={handleClear} />

            {properties.length === 0 ? (
                <div className="empty-state">
                    <h2>No properties found</h2>
                    <p>Try changing your filters or clearing them to see all properties.</p>
                </div>
            ) : (
                <section className="property-grid">
                    {properties.map((property) => (
                        <PropertyCard
                            key={property.L_ListingID}
                            property={property}
                        />
                    ))}
                </section>
            )}
        </main>
    );
}

export default ListingsPage;