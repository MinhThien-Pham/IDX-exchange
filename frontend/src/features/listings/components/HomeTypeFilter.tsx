import { useHomeTypes } from '../hooks/useSearchOptions';

export default function HomeTypeFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const types = useHomeTypes();
  const options = types.data ?? [];
  return (
    <div className="home-type-filter">
      <label className="field">
        Home type
        <select
          name="homeType"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={types.isPending && !value}
        >
          <option value="">All home types</option>
          {value && !options.some((type) => type.value === value) && (
            <option value={value}>{value.replace(/-/g, ' ')}</option>
          )}
          {options.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </label>
      {types.isPending && (
        <p className="filter-help" role="status">
          Loading home types…
        </p>
      )}
      {types.isError && (
        <p className="filter-help" role="status">
          Home types couldn’t load.{' '}
          <button
            type="button"
            className="button button-quiet"
            onClick={() => void types.refetch()}
          >
            Retry home types
          </button>
        </p>
      )}
    </div>
  );
}
