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
});

test('unknown facts are omitted and an unavailable image has a useful fallback', () => {
  renderCard({ ...listing, price: null, squareFeet: 0, bedrooms: null, photos: [] });
  expect(screen.getByText('Price unavailable')).toBeInTheDocument();
  expect(screen.queryByText(/\/sqft$/)).not.toBeInTheDocument();
  expect(screen.queryByText('N/A')).not.toBeInTheDocument();
  expect(screen.getByRole('img', { name: 'Photo unavailable' })).toBeInTheDocument();
});

test('failed remote images fall back without losing the listing link', () => {
  renderCard();
  fireEvent.error(screen.getByRole('img'));
  expect(screen.getByRole('img', { name: 'Photo unavailable' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /view 123 canon drive/i })).toBeInTheDocument();
});
