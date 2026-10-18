import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import ListingsPage from '../../../pages/ListingsPage';
import PropertyDetailPage from '../../../pages/PropertyDetailPage';
import { listing, mockJsonResponse } from '../../../test/fixtures';

const fetchMock = jest.fn<Promise<Response>, Parameters<typeof fetch>>();
beforeEach(() => {
  global.fetch = fetchMock;
});

function LocationTools() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <output data-testid="location">
        {location.pathname}
        {location.search}
      </output>
      <button onClick={() => navigate(-1)}>Browser back</button>
    </>
  );
}
function renderListings(url = '/') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[url]}>
        <LocationTools />
        <Routes>
          <Route path="/" element={<ListingsPage />} />
          <Route path="/property/:id" element={<PropertyDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
function respondToRoutes() {
  fetchMock.mockImplementation(async (input) => {
    const url = String(input);
    if (url.endsWith('/openhouses')) return mockJsonResponse([]);
    if (/\/listings\/1001$/.test(url)) return mockJsonResponse(listing);
    const query = new URL(url, 'http://localhost').searchParams;
    return mockJsonResponse({
      total: 60,
      limit: Number(query.get('limit') ?? 20),
      offset: Number(query.get('offset') ?? 0),
      results: [listing],
    });
  });
}

test('loads a shared URL, changes filters and restores them with browser back', async () => {
  respondToRoutes();
  renderListings('/?city=Boston&offset=20&sortBy=price&sortOrder=ASC');
  await screen.findByText('123 Canon Drive');
  expect(screen.getByLabelText('City')).toHaveValue('Boston');
  expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('offset=20'), expect.any(Object));
  fireEvent.change(screen.getByLabelText('City'), { target: { value: 'Miami' } });
  fireEvent.click(screen.getByRole('button', { name: 'Search' }));
  await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('city=Miami'));
  expect(screen.getByTestId('location')).toHaveTextContent('offset=0');
  fireEvent.click(screen.getByRole('button', { name: 'Browser back' }));
  await waitFor(() => expect(screen.getByLabelText('City')).toHaveValue('Boston'));
  expect(screen.getByTestId('location')).toHaveTextContent('offset=20');
});

test('server pagination and sorting are reflected in the shareable URL', async () => {
  respondToRoutes();
  renderListings();
  await screen.findByText('123 Canon Drive');
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('offset=20'));
  fireEvent.change(screen.getByLabelText('Sort by'), { target: { value: 'price' } });
  await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('sortBy=price'));
  expect(screen.getByTestId('location')).toHaveTextContent('offset=0');
});

test('rapid search and sort commands compose before the router commits a render', async () => {
  respondToRoutes();
  renderListings('/?limit=2');
  await screen.findByText('123 Canon Drive');
  fireEvent.change(screen.getByLabelText('City'), { target: { value: 'Pasadena' } });
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    fireEvent.change(screen.getByLabelText('Sort by'), { target: { value: 'price' } });
    fireEvent.change(screen.getByLabelText('Order'), { target: { value: 'ASC' } });
  });
  await waitFor(() => {
    const url = screen.getByTestId('location');
    expect(url).toHaveTextContent('city=Pasadena');
    expect(url).toHaveTextContent('limit=2');
    expect(url).toHaveTextContent('sortBy=price');
    expect(url).toHaveTextContent('sortOrder=ASC');
  });
  expect(screen.getByLabelText('City')).toHaveValue('Pasadena');
  expect(fetchMock).toHaveBeenLastCalledWith(
    expect.stringMatching(/city=Pasadena.*sortBy=price&sortOrder=ASC/),
    expect.any(Object),
  );

  // A POP must replace the draft before another burst of UI commands.
  fireEvent.click(screen.getByRole('button', { name: 'Browser back' }));
  await waitFor(() => expect(screen.getByLabelText('Order')).toHaveValue('DESC'));
  act(() => {
    fireEvent.change(screen.getByLabelText('Sort by'), { target: { value: 'squareFeet' } });
    fireEvent.change(screen.getByLabelText('Order'), { target: { value: 'ASC' } });
  });
  await waitFor(() => {
    const url = screen.getByTestId('location');
    expect(url).toHaveTextContent('city=Pasadena');
    expect(url).toHaveTextContent('sortBy=squareFeet');
    expect(url).toHaveTextContent('sortOrder=ASC');
  });
});

test('listing detail and Back to Listings retain active filters', async () => {
  respondToRoutes();
  renderListings('/?city=Boston&offset=20');
  fireEvent.click(await screen.findByRole('link', { name: /view 123 canon drive/i }));
  await screen.findByText('Property Details');
  fireEvent.click(screen.getByRole('button', { name: /Back to Listings/ }));
  await screen.findByRole('heading', { name: 'Property Listings' });
  expect(screen.getByLabelText('City')).toHaveValue('Boston');
  expect(screen.getByTestId('location')).toHaveTextContent('offset=20');
});

test('failed search shows a retry action and recovers', async () => {
  fetchMock.mockResolvedValueOnce(
    mockJsonResponse(
      { error: { code: 'SERVICE_UNAVAILABLE', message: 'Please try again shortly.' } },
      503,
    ),
  );
  renderListings();
  expect(await screen.findByRole('alert')).toHaveTextContent('Please try again shortly.');
  respondToRoutes();
  fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));
  await screen.findByText('123 Canon Drive');
});

test('invalid shared URL is rejected before a network call', () => {
  renderListings('/?minPrice=900&maxPrice=100');
  expect(screen.getByRole('alert')).toHaveTextContent(
    'Minimum price must not exceed maximum price.',
  );
  expect(fetchMock).not.toHaveBeenCalled();
});

test('a stale shared page can return to the first page when the dataset has shrunk', async () => {
  fetchMock.mockResolvedValueOnce(
    mockJsonResponse({ total: 5, limit: 20, offset: 20, results: [] }),
  );
  renderListings('/?city=Boston&offset=20');
  await screen.findByRole('heading', { name: 'No properties on this page' });
  expect(screen.getByText('Showing 0-0 of 5 properties')).toBeInTheDocument();
  respondToRoutes();
  fireEvent.click(screen.getByRole('button', { name: 'Return to first page' }));
  await screen.findByText('123 Canon Drive');
  expect(screen.getByTestId('location')).toHaveTextContent('offset=0');
  expect(screen.getByLabelText('City')).toHaveValue('Boston');
});
