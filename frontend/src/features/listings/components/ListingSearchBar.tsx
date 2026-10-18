import { Search, SlidersHorizontal } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { type SearchListingsQuery } from '@idx/contracts';
import {
  locationFilters,
  locationText,
  refinementKeys,
  sortFields,
  sortOptions,
  sortValue,
} from '../model/search-form';
import { validSearchSchema } from '../model/search-query';

export default function ListingSearchBar({
  query,
  onApply,
  onSort,
  onToggleFilters,
  sidebarOpen,
  pinned,
}: {
  query: SearchListingsQuery;
  onApply: (query: SearchListingsQuery) => void;
  onSort: (sort: Pick<SearchListingsQuery, 'sortBy' | 'sortOrder'>) => void;
  onToggleFilters: () => void;
  sidebarOpen: boolean;
  pinned: boolean;
}) {
  const [location, setLocation] = useState(() => locationText(query));
  const [error, setError] = useState('');
  const errorId = useId();
  const count = refinementKeys.filter((key) => query[key] !== undefined).length;
  function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = validSearchSchema.safeParse({
      ...query,
      ...(location.trim() !== locationText(query) ? locationFilters(location) : {}),
      offset: 0,
    });
    if (!parsed.success) {
      setError(parsed.error.issues.map((issue) => issue.message).join(' '));
      return;
    }
    setError('');
    onApply(parsed.data);
  }
  return (
    <form className="listing-search-bar" aria-label="Search homes" onSubmit={submit} noValidate>
      <label className="field search-location">
        City or ZIP code
        <input
          value={location}
          onChange={(event) => {
            setLocation(event.target.value);
            setError('');
          }}
          name="location"
          placeholder="e.g. San Diego or 92101"
          maxLength={100}
          autoComplete="off"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
        />
      </label>
      <button
        type="submit"
        className="button button-primary search-submit"
        aria-label="Search listings"
      >
        <Search aria-hidden="true" />
        <span>Search</span>
      </button>
      {!pinned && (
        <button
          type="button"
          className={`button ${sidebarOpen ? 'button-soft' : ''}`}
          aria-expanded={sidebarOpen}
          aria-controls="desktop-filters"
          onClick={onToggleFilters}
        >
          <SlidersHorizontal aria-hidden="true" />
          Filters{count > 0 && <span className="filter-count">{count}</span>}
        </button>
      )}
      <label className="field search-sort">
        Sort
        <select
          aria-label="Sort listings"
          value={sortValue(query)}
          onChange={(event) => onSort(sortFields(event.target.value))}
        >
          {sortOptions.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      {error && (
        <p className="field-error toolbar-error" role="alert" id={errorId}>
          {error}
        </p>
      )}
    </form>
  );
}
