import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { fetchProperties } from '../api/client';
import Pagination from '../components/Pagination';
import PropertyCard from '../components/PropertyCard';
import PropertyFilters from '../components/PropertyFilters';

import './ListingsPage.css';

function ListingsPage() {
    const location = useLocation();
    const savedListingsState = location.state?.listingsState;

    const [properties, setProperties] = useState([]);
    const [total, setTotal] = useState(0);
    const [limit] = useState(20);

    const [currentPage, setCurrentPage] = useState(
        () => savedListingsState?.currentPage || 1
    );

    const [filters, setFilters] = useState(
        () => savedListingsState?.filters || {}
    );

    const [sortBy, setSortBy] = useState(
        () => savedListingsState?.sortBy || ''
    );

    const [sortOrder, setSortOrder] = useState(
        () => savedListingsState?.sortOrder || 'ASC'
    );

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const requestIdRef = useRef(0);

    const loadProperties = useCallback(
        async (activeFilters = {}) => {
            const requestId = requestIdRef.current + 1;
            requestIdRef.current = requestId;

            try {
                setLoading(true);
                setError('');

                const offset = (currentPage - 1) * limit;

                const data = await fetchProperties({
                    ...activeFilters,
                    limit,
                    offset,
                    ...(sortBy && {
                        sortBy,
                        sortOrder,
                    }),
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

                setError(
                    'Failed to load properties. Please make sure the backend server is running.'
                );
            } finally {
                if (requestId === requestIdRef.current) {
                    setLoading(false);
                }
            }
        },
        [currentPage, limit, sortBy, sortOrder]
    );

    useEffect(() => {
        loadProperties(filters);
    }, [filters, loadProperties]);

    function handleSearch(newFilters) {
        setFilters(newFilters);
        setCurrentPage(1);
        setSortBy('');
        setSortOrder('ASC');
    }

    function handleClear() {
        setFilters({});
        setCurrentPage(1);
        setSortBy('');
        setSortOrder('ASC');
    }

    function handleSortByChange(event) {
        setSortBy(event.target.value);
        setSortOrder('ASC');
        setCurrentPage(1);
    }

    function handleSortOrderChange(event) {
        setSortOrder(event.target.value);
        setCurrentPage(1);
    }

    function handlePageChange(page) {
        setCurrentPage(page);
        window.scrollTo(0, 0);
    }

    if (loading) {
        return (
            <main className="listings-page">
                <p className="loading-message">
                    Loading properties...
                </p>
            </main>
        );
    }

    if (error) {
        return (
            <main className="listings-page">
                <div className="error-box">
                    <h1>Unable to load properties</h1>
                    <p>{error}</p>

                    <button
                        type="button"
                        onClick={() => loadProperties(filters)}
                    >
                        Try Again
                    </button>
                </div>
            </main>
        );
    }

    const totalPages = Math.ceil(total / limit);

    const startResult =
        total === 0
            ? 0
            : (currentPage - 1) * limit + 1;

    const endResult =
        total === 0
            ? 0
            : Math.min(currentPage * limit, total);

    return (
        <main className="listings-page">
            <header className="listings-header">
                <h1>Property Listings</h1>

                <p>
                    Showing {startResult}-{endResult} of{' '}
                    {total} properties
                </p>
            </header>

            <PropertyFilters
                onSearch={handleSearch}
                onClear={handleClear}
                initialValues={filters}
            />

            <div className="sort-controls">
                <label htmlFor="sort-by">
                    Sort by
                </label>

                <select
                    id="sort-by"
                    value={sortBy}
                    onChange={handleSortByChange}
                >
                    <option value="">Default</option>
                    <option value="L_SystemPrice">
                        Price
                    </option>
                    <option value="ListingContractDate">
                        Date Listed
                    </option>
                    <option value="LM_Int2_3">
                        Square Feet
                    </option>
                    <option value="L_Keyword2">
                        Bedrooms
                    </option>
                </select>

                {sortBy && (
                    <>
                        <label htmlFor="sort-order">
                            Order
                        </label>

                        <select
                            id="sort-order"
                            value={sortOrder}
                            onChange={handleSortOrderChange}
                        >
                            <option value="ASC">
                                {sortBy ===
                                    'ListingContractDate'
                                    ? 'Oldest to Newest'
                                    : 'Low to High'}
                            </option>

                            <option value="DESC">
                                {sortBy ===
                                    'ListingContractDate'
                                    ? 'Newest to Oldest'
                                    : 'High to Low'}
                            </option>
                        </select>
                    </>
                )}
            </div>

            {properties.length === 0 ? (
                <div className="empty-state">
                    <h2>No properties found</h2>

                    <p>
                        Try changing your filters or
                        clearing them to see all properties.
                    </p>
                </div>
            ) : (
                <>
                    <section className="property-grid">
                        {properties.map((property) => (
                            <PropertyCard
                                key={property.L_ListingID}
                                property={property}
                                listingsState={{
                                    filters,
                                    currentPage,
                                    sortBy,
                                    sortOrder,
                                }}
                            />
                        ))}
                    </section>

                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                    />
                </>
            )}
        </main>
    );
}

export default ListingsPage;