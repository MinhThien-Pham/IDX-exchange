import { Bath, BedDouble, CalendarDays, Ruler } from 'lucide-react';
import type { ListingDto } from '@idx/contracts';
import { formatListingDate } from '../../../shared/utils/formatting';

/** Headline facts; a missing value is omitted rather than shown as zero. */
export function headlineFacts(property: ListingDto) {
  return [
    { value: property.bedrooms, label: 'Bedrooms', Icon: BedDouble, format: true },
    { value: property.bathrooms, label: 'Bathrooms', Icon: Bath, format: true },
    { value: property.squareFeet, label: 'Square feet', Icon: Ruler, format: true },
    { value: property.yearBuilt, label: 'Year built', Icon: CalendarDays, format: false },
  ].filter((fact) => fact.value !== null);
}

export function PropertyFacts({ facts }: { facts: ReturnType<typeof headlineFacts> }) {
  if (!facts.length) return null;
  return (
    <section className="detail-stats" aria-label="Property facts">
      {facts.map(({ value, label, Icon, format }) => (
        <div key={label}>
          <strong>{format ? value?.toLocaleString('en-US') : value}</strong>
          <span>
            <Icon aria-hidden="true" />
            {label}
          </span>
        </div>
      ))}
    </section>
  );
}

export function PropertyDetailsList({ property }: { property: ListingDto }) {
  const rows: [string, string | number | null][] = [
    ['Property type', property.propertyType],
    ['Property subtype', property.homeType?.label ?? property.propertySubType],
    ['Lot size', property.lotSizeAcres !== null ? `${property.lotSizeAcres} acres` : null],
    ['Parking spaces', property.parkingSpaces],
    ['Listing ID', property.externalId],
    ['Listed', property.listedAt ? formatListingDate(property.listedAt) : null],
  ];
  return (
    <dl className="detail-definition">
      {rows
        .filter(([, value]) => value !== null && value !== '')
        .map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
    </dl>
  );
}
