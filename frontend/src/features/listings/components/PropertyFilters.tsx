import { type ChangeEvent, type FormEvent, useState } from 'react';
import { type ListingFilters } from '@idx/contracts';
import { validSearchSchema } from '../hooks/useListingSearch';
import './PropertyFilters.css';

const emptyFilters = { city: '', zipcode: '', minPrice: '', maxPrice: '', beds: '', baths: '' };
type FilterInput = typeof emptyFilters;

function toFormValues(values: ListingFilters): FilterInput {
  return Object.fromEntries(
    Object.keys(emptyFilters).map((key) => [
      key,
      String(values[key as keyof ListingFilters] ?? ''),
    ]),
  ) as FilterInput;
}

export default function PropertyFilters({
  initialValues = {},
  onSearch,
  onClear,
}: {
  initialValues?: ListingFilters;
  onSearch: (filters: ListingFilters) => void;
  onClear: () => void;
}) {
  const [filters, setFilters] = useState(() => toFormValues(initialValues));
  const [error, setError] = useState('');
  function change(event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setFilters((current) => ({ ...current, [event.target.name]: event.target.value }));
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    const input = Object.fromEntries(
      Object.entries(filters).filter(([, value]) => value.trim() !== ''),
    );
    const parsed = validSearchSchema.safeParse(input);
    if (!parsed.success) {
      setError(parsed.error.issues.map((issue) => issue.message).join(' '));
      return;
    }
    setError('');
    const { city, zipcode, minPrice, maxPrice, beds, baths } = parsed.data;
    onSearch({ city, zipcode, minPrice, maxPrice, beds, baths });
  }
  return (
    <form className="property-filters" onSubmit={submit} noValidate>
      <div className="filter-grid">
        <label>
          City
          <input
            name="city"
            value={filters.city}
            onChange={change}
            placeholder="e.g. Beverly Hills"
            maxLength={100}
          />
        </label>
        <label>
          ZIP Code
          <input
            name="zipcode"
            value={filters.zipcode}
            onChange={change}
            placeholder="e.g. 90210"
            maxLength={20}
          />
        </label>
        <label>
          Min Price
          <input
            name="minPrice"
            type="number"
            min="0"
            value={filters.minPrice}
            onChange={change}
            placeholder="e.g. 300000"
          />
        </label>
        <label>
          Max Price
          <input
            name="maxPrice"
            type="number"
            min="0"
            value={filters.maxPrice}
            onChange={change}
            placeholder="e.g. 1000000"
          />
        </label>
        {(['beds', 'baths'] as const).map((name) => (
          <label key={name}>
            {name === 'beds' ? 'Beds' : 'Baths'}
            <select name={name} value={filters[name]} onChange={change}>
              <option value="">Any</option>
              {[1, 2, 3, 4, 5].map((count) => (
                <option key={count} value={count}>
                  {count}+
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      {error && (
        <p role="alert" className="filter-error">
          {error}
        </p>
      )}
      <div className="filter-actions">
        <button type="submit">Search</button>
        <button
          type="button"
          className="clear-button"
          onClick={() => {
            setFilters(emptyFilters);
            setError('');
            onClear();
          }}
        >
          Clear Filters
        </button>
      </div>
    </form>
  );
}
