import { useRef, useState } from 'react';
import { House, RotateCcw, Search, SlidersHorizontal, WifiOff } from 'lucide-react';
import { type SearchListingsQuery } from '@idx/contracts';
import heroPhoto from '../../../assets/san-dimas-home.jpg';
import Pagination from '../../../shared/ui/Pagination';
import Modal from '../../../shared/ui/Modal';
import { compactLayoutQuery, useMediaQuery } from '../../../shared/hooks/useMediaQuery';
import { usePageScroll } from '../../../shared/hooks/usePageScroll';
import PropertyCard from './PropertyCard';
import PropertyFilters from './PropertyFilters';
import ListingSearchBar from './ListingSearchBar';
import AppliedFilters from './AppliedFilters';
import { useListings } from '../hooks/useListings';
import { useListingSearch } from '../hooks/useListingSearch';
import { filterKeys, sortLabel } from '../model/search-form';
import '../../../pages/ListingsPage.css';

export default function ListingsView() {
  const search = useListingSearch();
  const listings = useListings(search.query, !search.error);
  const compact = useMediaQuery(compactLayoutQuery);
  const pinned = useMediaQuery('(min-width: 1360px)');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const resultsRef = useRef<HTMLElement>(null);
  const { limit, offset, city, zipcode } = search.query;
  const dataReady =
    Boolean(listings.data) && !listings.isError && !search.error && !listings.isPlaceholderData;
  usePageScroll(!listings.isPending || Boolean(search.error));
  const total = listings.data?.total ?? 0;
  const results = listings.data?.results ?? [];
  const filterKey = JSON.stringify(search.filters);
  const activeCount = filterKeys.filter((key) => search.filters[key] !== undefined).length;
  const locationLabel = city
    ? `in ${city}${zipcode ? ` · ${zipcode}` : ''}`
    : zipcode
      ? `in ZIP ${zipcode}`
      : 'All locations';
  const apply = (query: SearchListingsQuery) => {
    search.search(query, { sortBy: query.sortBy, sortOrder: query.sortOrder });
    setSheetOpen(false);
  };
  const changePage = (page: number) => {
    const top = resultsRef.current
      ? Math.max(
          0,
          resultsRef.current.getBoundingClientRect().top + window.scrollY - (compact ? 90 : 210),
        )
      : 0;
    search.update({ offset: (page - 1) * limit }, top);
  };
  const editSearch = () => {
    if (compact) setSheetOpen(true);
    else {
      setSidebarOpen(true);
      document
        .querySelector<HTMLInputElement>('.search-location input')
        ?.focus({ preventScroll: true });
    }
  };

  return (
    <main id="main-content" className="listings-page">
      <section className="hero" aria-label="Welcome to IDX Exchange">
        <div className="hero-inner page-container">
          <div className="hero-copy">
            <p className="hero-kicker">Residential property search</p>
            <h1>
              A little closer to
              <br />
              <span>your next home.</span>
            </h1>
            <p className="hero-description">
              Explore the photos, the possibilities, and the details that matter to you.
            </p>
          </div>
          <div className="hero-photo">
            <img
              src={heroPhoto}
              alt="A two-story home surrounded by trees and a lawn in San Dimas, California"
              fetchPriority="high"
            />
          </div>
        </div>
      </section>
      {!compact && (
        <div className="sticky-search page-container">
          <ListingSearchBar
            key={JSON.stringify([city, zipcode])}
            query={search.query}
            onApply={apply}
            onSort={(sort) => search.update({ ...sort, offset: 0 })}
            onToggleFilters={() => setSidebarOpen((value) => !value)}
            sidebarOpen={pinned || sidebarOpen}
            pinned={pinned}
          />
        </div>
      )}
      <div className="page-container listings-content">
        <div className="listings-workspace" data-sidebar={!compact && (pinned || sidebarOpen)}>
          {!compact && (
            <aside
              id="desktop-filters"
              className="desktop-filters"
              hidden={!pinned && !sidebarOpen}
            >
              <PropertyFilters key={filterKey} query={search.query} onApply={apply} />
            </aside>
          )}
          <section ref={resultsRef} className="listing-results" aria-label="Property results">
            <header className="results-header">
              <h2 className="results-total" aria-live="polite" aria-atomic="true">
                {search.error
                  ? 'Your search'
                  : listings.isError
                    ? 'Homes unavailable'
                    : listings.isPending || listings.isPlaceholderData
                      ? 'Finding homes…'
                      : `${total.toLocaleString('en-US')} ${total === 1 ? 'home' : 'homes'}`}
              </h2>
              <p className="results-location">{locationLabel}</p>
              {compact && <p className="results-sort">{sortLabel(search.query)}</p>}
            </header>
            <AppliedFilters
              filters={search.filters}
              onRemove={(key) => search.update({ [key]: undefined, offset: 0 })}
              onClear={search.clear}
            />
            {search.error ? (
              <div className="result-state" role="alert">
                <Search aria-hidden="true" />
                <h2>Invalid search</h2>
                <p>{search.error}</p>
                <button type="button" className="button button-primary" onClick={search.clear}>
                  Reset search
                </button>
              </div>
            ) : listings.isError ? (
              <div className="result-state" role="alert">
                <WifiOff aria-hidden="true" />
                <h2>Listings couldn&apos;t load.</h2>
                <p>{listings.error.message}</p>
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => void listings.refetch()}
                >
                  <RotateCcw aria-hidden="true" />
                  Try again
                </button>
              </div>
            ) : listings.isPending ? (
              <>
                <p className="sr-only" role="status">
                  Loading listings…
                </p>
                <div className="property-grid" aria-hidden="true">
                  {[1, 2, 3].map((key) => (
                    <div className="listing-skeleton" key={key}>
                      <div />
                      <span />
                      <span />
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div aria-busy={listings.isFetching}>
                {listings.isFetching && (
                  <p className="updating-results" role="status">
                    Updating results…
                  </p>
                )}
                {results.length === 0 ? (
                  <div className="result-state">
                    <House aria-hidden="true" />
                    <h2>
                      {total > 0 && offset > 0
                        ? 'No homes on this page'
                        : 'No homes match this search.'}
                    </h2>
                    <p>Remove a filter, broaden your budget, or try another location.</p>
                    {total > 0 && offset > 0 ? (
                      <button
                        type="button"
                        className="button button-primary"
                        onClick={() => changePage(1)}
                      >
                        Return to first page
                      </button>
                    ) : (
                      <button type="button" className="button button-primary" onClick={editSearch}>
                        Edit search
                      </button>
                    )}
                    {activeCount > 0 && (
                      <button type="button" className="button button-quiet" onClick={search.clear}>
                        Clear all filters
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="property-grid">
                    {results.map((property) => (
                      <PropertyCard key={property.id} property={property} />
                    ))}
                  </div>
                )}
                {!compact && (
                  <footer className="results-footer">
                    {!listings.isPlaceholderData && (
                      <p>
                        Showing {results.length ? (offset + 1).toLocaleString('en-US') : 0}–
                        {results.length
                          ? Math.min(offset + results.length, total).toLocaleString('en-US')
                          : 0}{' '}
                        of {total.toLocaleString('en-US')}
                      </p>
                    )}
                    <Pagination
                      currentPage={search.currentPage}
                      totalPages={Math.ceil(total / limit)}
                      onPageChange={changePage}
                      disabled={listings.isPlaceholderData}
                    />
                  </footer>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
      {compact && (
        <div className="mobile-dock" role="region" aria-label="Listing actions">
          <button
            type="button"
            className="button button-primary dock-search"
            onClick={() => setSheetOpen(true)}
            aria-label="Search and filters"
          >
            <SlidersHorizontal aria-hidden="true" />
            <span className="dock-search-long">Search &amp; filters</span>
            <span className="dock-search-short">Search</span>
            {activeCount > 0 && <span className="filter-count">{activeCount}</span>}
          </button>
          <Pagination
            compact
            currentPage={search.currentPage}
            totalPages={dataReady ? Math.ceil(total / limit) : 0}
            onPageChange={changePage}
            disabled={!dataReady || listings.isPlaceholderData}
          />
        </div>
      )}
      {sheetOpen && (
        <Modal
          className="filter-dialog"
          labelledBy="filters-title"
          onClose={() => setSheetOpen(false)}
          initialFocus=".filter-actions button"
        >
          <header className="filter-dialog-header">
            <h2 id="filters-title">Search &amp; filters</h2>
            <p>Find a place that fits.</p>
          </header>
          <PropertyFilters
            variant="sheet"
            query={search.query}
            onApply={apply}
            onCancel={() => setSheetOpen(false)}
          />
        </Modal>
      )}
    </main>
  );
}
