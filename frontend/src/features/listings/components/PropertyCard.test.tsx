import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import PropertyCard from './PropertyCard';
import { listing } from '../../../test/fixtures';

function Destination() {
  const location = useLocation();
  return (
    <p>
      Detail {location.pathname} from {location.state?.from}
    </p>
  );
}
function renderCard(property = listing) {
  render(
    <MemoryRouter initialEntries={['/?city=Beverly+Hills&offset=20']}>
      <Routes>
        <Route path="/" element={<PropertyCard property={property} />} />
        <Route path="/property/:id" element={<Destination />} />
      </Routes>
    </MemoryRouter>,
  );
}

test('card uses a native link and preserves the search destination', () => {
  renderCard();
  const link = screen.getByRole('link', { name: /view 123 canon drive/i });
  expect(link.tagName).toBe('A');
  expect(link).toHaveAttribute('href', '/property/1001');
  fireEvent.click(link);
  expect(
    screen.getByText('Detail /property/1001 from /?city=Beverly+Hills&offset=20'),
  ).toBeInTheDocument();
});

test('card prioritizes price and includes valid derived price per square foot', () => {
  renderCard();
  for (const text of ['$900,000', '$500/sqft', '123 Canon Drive', 'Beverly Hills, CA 90210'])
    expect(screen.getByText(text)).toBeInTheDocument();
  expect(screen.getByText('2.5')).toBeInTheDocument();
  expect(screen.getByText('1,800')).toBeInTheDocument();
  expect(screen.getByText('Single-family')).toBeInTheDocument();
  expect(screen.queryByText('Residential')).not.toBeInTheDocument();
});

test('unknown facts are omitted and an unavailable image has a useful fallback', () => {
  renderCard({ ...listing, price: null, squareFeet: 0, bedrooms: null, photos: [] });
  expect(screen.getByText('Price unavailable')).toBeInTheDocument();
  expect(screen.queryByText(/\/sqft$/)).not.toBeInTheDocument();
  expect(screen.queryByText('N/A')).not.toBeInTheDocument();
  expect(screen.getByRole('img', { name: 'Photo unavailable' })).toBeInTheDocument();
});

const image = (src: string) => document.querySelector<HTMLImageElement>(`img[src="${src}"]`);

test('a failed cover falls back to the next photo without losing the listing link', () => {
  const photos = ['https://example.com/card-a.jpg', 'https://example.com/card-b.jpg'];
  renderCard({ ...listing, photos });
  fireEvent.error(image(photos[0]!)!);
  expect(image(photos[1]!)).toBeInTheDocument();
  expect(screen.queryByRole('img', { name: 'Photo unavailable' })).not.toBeInTheDocument();
  fireEvent.error(image(photos[1]!)!);
  expect(screen.getByRole('img', { name: 'Photo unavailable' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /view 123 canon drive/i })).toBeInTheDocument();
});

test('a card tries at most three photos and shows no photo count', () => {
  const photos = ['a', 'b', 'c', 'd'].map((name) => `https://example.com/try-${name}.jpg`);
  renderCard({ ...listing, photos });
  for (const photo of photos.slice(0, 3)) fireEvent.error(image(photo)!);
  expect(image(photos[3]!)).not.toBeInTheDocument();
  expect(screen.getByRole('img', { name: 'Photo unavailable' })).toBeInTheDocument();
  expect(screen.queryByLabelText(/\d+ photos/)).not.toBeInTheDocument();
});

test('a missing subtype omits the badge instead of displaying a generic class', () => {
  renderCard({ ...listing, propertySubType: null, homeType: null });
  expect(screen.queryByText('Residential')).not.toBeInTheDocument();
  expect(document.querySelector('.property-tag')).not.toBeInTheDocument();
});
