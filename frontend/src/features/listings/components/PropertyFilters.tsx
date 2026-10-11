import { Bath, BedDouble, SlidersHorizontal, Search, ArrowLeft } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { type SearchListingsQuery } from '@idx/contracts';
import { formValues, parseSearchForm, sortOptions, type SearchForm } from '../model/search-form';
import './PropertyFilters.css';
import LocationInput from './LocationInput';
import HomeTypeFilter from './HomeTypeFilter';

type Props = {
  query: SearchListingsQuery;
  variant?: 'sidebar' | 'sheet';
  onApply: (query: SearchListingsQuery) => void;
  onCancel?: () => void;
};

export default function PropertyFilters({ query, variant = 'sidebar', onApply, onCancel }: Props) {
  const [draft, setDraft] = useState(() => formValues(query));
  const [error, setError] = useState('');
  const errorId = useId();
  const sheet = variant === 'sheet';
  function change(name: keyof SearchForm, value: string) {
    setDraft((current) => ({ ...current, [name]: value }));
    setError('');
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = parseSearchForm(draft, query, sheet);
    if (!parsed.success) {
      setError(parsed.error.issues.map((issue) => issue.message).join(' '));
      return;
    }
    onApply(parsed.data);
  }
  const numberChoices = (name: 'beds' | 'baths') => {
    const base = name === 'beds' ? ['1', '2', '3', '4', '5'] : ['1', '1.5', '2', '2.5', '3'];
    return ['', ...new Set([...base, ...(draft[name] ? [draft[name]] : [])])];
  };
  return (
    <form
      className={`property-filters ${sheet ? 'filter-sheet-form' : 'filter-sidebar'}`}
      onSubmit={submit}
      noValidate
      aria-label={sheet ? 'Search and filters' : 'Property filters'}
      aria-describedby={error ? errorId : undefined}
    >
      {!sheet && (
        <h2 className="filter-title">
          <SlidersHorizontal aria-hidden="true" />
          Filters
        </h2>
      )}
      <div className="filter-fields">
        {sheet && (
          <LocationInput value={draft.location} onChange={(value) => change('location', value)} />
        )}
        <HomeTypeFilter value={draft.homeType} onChange={(value) => change('homeType', value)} />
        <div className="price-fields">
          {(['minPrice', 'maxPrice'] as const).map((name) => (
            <label className="field" key={name}>
              {name === 'minPrice' ? 'Min price' : 'Max price'}
              <input
                name={name}
                type="number"
                min="0"
                inputMode="decimal"
                value={draft[name]}
                onChange={(event) => change(name, event.target.value)}
                placeholder={name === 'minPrice' ? 'No min' : 'No max'}
              />
            </label>
          ))}
        </div>
        {(['beds', 'baths'] as const).map((name) =>
          sheet ? (
            <fieldset className="room-choices" key={name}>
              <legend>
                {name === 'beds' ? <BedDouble aria-hidden="true" /> : <Bath aria-hidden="true" />}
                {name === 'beds' ? 'Bedrooms' : 'Bathrooms'}
              </legend>
              <div>
                {numberChoices(name).map((value) => (
                  <button
                    type="button"
                    key={value}
                    aria-pressed={draft[name] === value}
                    onClick={() => change(name, value)}
                  >
                    {value ? `${value}+` : 'Any'}
                  </button>
                ))}
              </div>
            </fieldset>
          ) : (
            <label className="field" key={name}>
              {name === 'beds' ? 'Bedrooms' : 'Bathrooms'}
              <select
                aria-label={name === 'beds' ? 'Bedrooms' : 'Bathrooms'}
                name={name}
                value={draft[name]}
                onChange={(event) => change(name, event.target.value)}
              >
                {numberChoices(name).map((value) => (
                  <option key={value} value={value}>
                    {value ? `${value}+` : 'Any'}
                  </option>
                ))}
              </select>
            </label>
          ),
        )}
        {sheet && (
          <label className="field">
            Sort
            <select
              aria-label="Sort"
              name="sort"
              value={draft.sort}
              onChange={(event) => change('sort', event.target.value)}
            >
              {sortOptions.map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        )}
        {error && (
          <p role="alert" className="field-error" id={errorId}>
            {error}
          </p>
        )}
        <button
          type="button"
          className="button button-quiet reset-filters"
          onClick={() => {
            setDraft((current) => ({
              ...current,
              minPrice: '',
              maxPrice: '',
              beds: '',
              baths: '',
              homeType: '',
            }));
            setError('');
            if (!sheet)
              onApply({
                ...query,
                minPrice: undefined,
                maxPrice: undefined,
                beds: undefined,
                baths: undefined,
                homeType: undefined,
                offset: 0,
              });
          }}
        >
          Reset filters
        </button>
      </div>
      <footer className="filter-actions">
        {sheet && (
          <button type="button" className="button" onClick={onCancel}>
            <ArrowLeft aria-hidden="true" />
            Cancel
          </button>
        )}
        <button type="submit" className="button button-primary">
          {sheet && <Search aria-hidden="true" />}
          {sheet ? 'Show homes' : 'Apply filters'}
        </button>
      </footer>
    </form>
  );
}
