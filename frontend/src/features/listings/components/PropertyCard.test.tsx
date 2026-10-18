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
function renderCard() {
  render(
    <MemoryRouter initialEntries={['/?city=Beverly+Hills&offset=20']}>
      <Routes>
        <Route path="/" element={<PropertyCard property={listing} />} />
        <Route path="/property/:id" element={<Destination />} />
      </Routes>
    </MemoryRouter>,
  );
}

test('renders normalized listing data including half bathrooms', () => {
  renderCard();
  for (const text of [
    '$900,000',
    '123 Canon Drive',
    'Beverly Hills, CA',
    '3 beds',
    '2.5 baths',
    '1800 sqft',
  ])
    expect(screen.getByText(text)).toBeInTheDocument();
});

test.each(['click', 'keyboard'])('opens a listing by %s and preserves the search URL', (method) => {
  renderCard();
  const card = screen.getByRole('link', { name: /view 123 canon drive/i });
  if (method === 'click') fireEvent.click(card);
  else fireEvent.keyDown(card, { key: 'Enter' });
  expect(
    screen.getByText('Detail /property/1001 from /?city=Beverly+Hills&offset=20'),
  ).toBeInTheDocument();
});

test('carousel click and Enter do not navigate the parent card', () => {
  renderCard();
  const next = screen.getByRole('button', { name: 'Next photo' });
  fireEvent.click(next);
  expect(screen.getByRole('img')).toHaveAttribute('src', 'https://example.com/two.jpg');
  fireEvent.keyDown(next, { key: 'Enter' });
  expect(screen.getByRole('link', { name: /view 123 canon drive/i })).toBeInTheDocument();
});
