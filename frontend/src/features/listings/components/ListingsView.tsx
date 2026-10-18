import Pagination from '../../../shared/ui/Pagination';
import PropertyCard from './PropertyCard';
import PropertyFilters from './PropertyFilters';
import { useListings } from '../hooks/useListings';
import { useListingSearch } from '../hooks/useListingSearch';
import { type SearchListingsQuery } from '@idx/contracts';
import '../../../pages/ListingsPage.css';

export default function ListingsView() {
  const search = useListingSearch();
  const listings = useListings(search.query, !search.error);
  const { limit, offset, sortBy, sortOrder } = search.query;
  const total = listings.data?.total ?? 0;
  const results = listings.data?.results ?? [];
  const filterKey = JSON.stringify(search.filters);

  return (
    <main className="listings-page">
      <header className="listings-header">
        <h1>Property Listings</h1>
        {listings.data && !search.error && (
          <p>
            Showing {results.length ? offset + 1 : 0}-
            {results.length ? Math.min(offset + results.length, total) : 0} of {total} properties
          </p>
        )}
      </header>
      <PropertyFilters
        key={filterKey}
        initialValues={search.filters}
        onSearch={search.search}
        onClear={search.clear}
      />
      <div className="sort-controls">
        <label htmlFor="sort-by">Sort by</label>
        <select
          id="sort-by"
          value={sortBy}
          onChange={(event) =>
            search.update({
              sortBy: event.target.value as SearchListingsQuery['sortBy'],
              offset: 0,
            })
          }
        >
          <option value="listedAt">Date Listed</option>
          <option value="price">Price</option>
          <option value="squareFeet">Square Feet</option>
          <option value="bedrooms">Bedrooms</option>
        </select>
        <label htmlFor="sort-order">Order</label>
        <select
          id="sort-order"
          value={sortOrder}
          onChange={(event) =>
            search.update({
              sortOrder: event.target.value as SearchListingsQuery['sortOrder'],
              offset: 0,
            })
          }
        >
          <option value="ASC">{sortBy === 'listedAt' ? 'Oldest to Newest' : 'Low to High'}</option>
          <option value="DESC">{sortBy === 'listedAt' ? 'Newest to Oldest' : 'High to Low'}</option>
        </select>
      </div>
      {search.error ? (
        <div className="error-box" role="alert">
          <h2>Invalid search</h2>
          <p>{search.error}</p>
          <button onClick={search.clear}>Reset search</button>
        </div>
      ) : listings.isError ? (
        <div className="error-box" role="alert">
          <h2>Unable to load properties</h2>
          <p>{listings.error.message}</p>
          <button onClick={() => void listings.refetch()}>Try Again</button>
        </div>
      ) : listings.isPending ? (
        <p className="loading-message" role="status">
          Loading properties...
        </p>
      ) : (
        <div aria-busy={listings.isFetching}>
          {listings.isFetching && <p role="status">Updating results...</p>}
          {results.length === 0 ? (
            <div className="empty-state">
              <h2>
                {total > 0 && offset > 0 ? 'No properties on this page' : 'No properties found'}
              </h2>
              <p>Try changing your filters or clearing them to see all properties.</p>
              {total > 0 && offset > 0 && (
                <button type="button" onClick={() => search.update({ offset: 0 })}>
                  Return to first page
                </button>
              )}
            </div>
          ) : (
            <section className="property-grid" aria-label="Property results">
              {results.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </section>
          )}
          <Pagination
            currentPage={search.currentPage}
            totalPages={Math.ceil(total / limit)}
            onPageChange={(page) => {
              search.update({ offset: (page - 1) * limit });
              window.scrollTo(0, 0);
            }}
          />
        </div>
      )}
    </main>
  );
}
