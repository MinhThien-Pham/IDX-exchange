import { X } from 'lucide-react';
import { type ListingFilters } from '@idx/contracts';
import { formatPrice } from '../../../shared/utils/formatting';
import { filterKeys } from '../model/search-form';
import { useHomeTypes } from '../hooks/useSearchOptions';

export default function AppliedFilters({
  filters,
  onRemove,
  onClear,
}: {
  filters: ListingFilters;
  onRemove: (key: keyof ListingFilters) => void;
  onClear: () => void;
}) {
  const types = useHomeTypes(Boolean(filters.homeType));
  const labels: Record<keyof ListingFilters, string> = {
    city: filters.city ?? '',
    zipcode: `ZIP ${filters.zipcode}`,
    minPrice: `Min ${formatPrice(filters.minPrice ?? null)}`,
    maxPrice: `Max ${formatPrice(filters.maxPrice ?? null)}`,
    beds: `${filters.beds}+ beds`,
    baths: `${filters.baths}+ baths`,
    homeType:
      types.data?.find((type) => type.value === filters.homeType)?.label ??
      filters.homeType?.replace(/-/g, ' ') ??
      '',
  };
  const active = filterKeys.filter((key) => filters[key] !== undefined);
  if (!active.length) return null;
  return (
    <div className="applied-filters" role="group" aria-label="Applied filters">
      {active.map((key) => (
        <button
          type="button"
          className="filter-chip"
          key={key}
          aria-label={`Remove ${labels[key]} filter`}
          onClick={() => onRemove(key)}
        >
          {labels[key]}
          <X aria-hidden="true" />
        </button>
      ))}
      <button type="button" className="button button-quiet" onClick={onClear}>
        Clear all
      </button>
    </div>
  );
}
