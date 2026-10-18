export function formatPrice(price: number | null): string {
  if (price === null || !Number.isFinite(price)) return 'Price unavailable';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(price);
}

export function formatPricePerSquareFoot(price: number | null, area: number | null) {
  return price !== null &&
    area !== null &&
    Number.isFinite(price) &&
    Number.isFinite(area) &&
    price > 0 &&
    area > 0
    ? `${formatPrice(price / area)}/sqft`
    : null;
}

export function formatListingDate(value: string) {
  const parsed = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isNaN(parsed.getTime())
    ? 'Date unavailable'
    : parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatPropertyLocation(property: { city: string; state: string; zipcode: string }) {
  const cityState = [property.city, property.state].filter(Boolean).join(', ');
  return [cityState, property.zipcode].filter(Boolean).join(' ') || 'Location unavailable';
}

export function formatOpenHouseDate(value: string): string {
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
}

export function formatTime(value: string | null): string {
  if (!value) return 'Time unavailable';
  const [hours, minutes] = value.split(':').map(Number);
  if (
    hours === undefined ||
    minutes === undefined ||
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes)
  )
    return value;
  const date = new Date(2000, 0, 1, hours, minutes);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
