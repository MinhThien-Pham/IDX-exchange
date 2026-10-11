import { useRef, useState } from 'react';
import { House, RotateCcw, Search, SlidersHorizontal, WifiOff } from 'lucide-react';
import { type SearchListingsQuery } from '@idx/contracts';
import Pagination from '../../../shared/ui/Pagination';
import Modal from '../../../shared/ui/Modal';
import ResultState from '../../../shared/ui/ResultState';
import { compactLayoutQuery, useMediaQuery } from '../../../shared/hooks/useMediaQuery';
import { usePageScroll } from '../../../shared/hooks/usePageScroll';
import PropertyCard from './PropertyCard';
import PropertyFilters from './PropertyFilters';
import ListingSearchBar from './ListingSearchBar';
import AppliedFilters from './AppliedFilters';
import ListingsHero from './ListingsHero';
import { useListings } from '../hooks/useListings';
import { useListingSearch } from '../hooks/useListingSearch';
import { filterKeys, sortLabel } from '../model/search-form';
import './ListingsView.css';

const formatCount = (value: number) => value.toLocaleString('en-US');

function locationLabel({ city, zipcode }: Pick<SearchListingsQuery, 'city' | 'zipcode'>) {
  if (city) return `in ${city}${zipcode ? ` · ${zipcode}` : ''}`;
  return zipcode ? `in ZIP ${zipcode}` : 'All locations';
}

function ResultsRange({ offset, shown, total }: { offset: number; shown: number; total: number }) {
  if (!shown) return <p>Showing 0–0 of {formatCount(total)}</p>;
  return (
    <p>
      Showing {formatCount(offset + 1)}–{formatCount(Math.min(offset + shown, total))} of{' '}
      {formatCount(total)}
    </p>
  );
}

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
  usePageScroll(dataReady || listings.isError || Boolean(search.error));
  const total = listings.data?.total ?? 0;
  const results = listings.data?.results ?? [];
  const filterKey = JSON.stringify(search.filters);
  const activeCount = filterKeys.filter((key) => search.filters[key] !== undefined).length;
  const pastLastPage = total > 0 && offset > 0;

  let heading = `${formatCount(total)} ${total === 1 ? 'home' : 'homes'}`;
  if (search.error) heading = 'Your search';
  else if (listings.isError) heading = 'Homes unavailable';
  else if (listings.isPending || listings.isPlaceholderData) heading = 'Finding homes…';

  const apply = (query: SearchListingsQuery) => {
    search.search(query, { sortBy: query.sortBy, sortOrder: query.sortOrder });
    setSheetOpen(false);
  };
  const changePage = (page: number) => {
    // Keep the results heading below the sticky desktop toolbar or phone header.
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
      <ListingsHero />
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
                {heading}
              </h2>
              <p className="results-location">{locationLabel({ city, zipcode })}</p>
              {compact && <p className="results-sort">{sortLabel(search.query)}</p>}
            </header>
            <AppliedFilters
              filters={search.filters}
              onRemove={(key) => search.update({ [key]: undefined, offset: 0 })}
              onClear={search.clear}
            />
            {search.error ? (
              <ResultState alert icon={Search} title="Invalid search" message={search.error}>
                <button type="button" className="button button-primary" onClick={search.clear}>
                  Reset search
                </button>
              </ResultState>
            ) : listings.isError ? (
              <ResultState
                alert
                icon={WifiOff}
                title="Listings couldn't load."
                message={listings.error.message}
              >
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => void listings.refetch()}
                >
                  <RotateCcw aria-hidden="true" />
                  Try again
                </button>
              </ResultState>
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
                  <ResultState
                    icon={House}
                    title={pastLastPage ? 'No homes on this page' : 'No homes match this search.'}
                    message="Remove a filter, broaden your budget, or try another location."
                  >
                    {pastLastPage ? (
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
                  </ResultState>
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
                      <ResultsRange offset={offset} shown={results.length} total={total} />
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
