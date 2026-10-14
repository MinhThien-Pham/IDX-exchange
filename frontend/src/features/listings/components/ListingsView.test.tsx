import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import ListingsPage from '../../../pages/ListingsPage';
import PropertyDetailPage from '../../../pages/PropertyDetailPage';
import { listing, mockJsonResponse } from '../../../test/fixtures';
import { compactLayoutQuery } from '../../../shared/hooks/useMediaQuery';

const fetchMock = jest.fn<Promise<Response>, Parameters<typeof fetch>>();
beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = (input, init) => {
    if (String(input).endsWith('/listings/home-types'))
      return Promise.resolve(
        mockJsonResponse([
          { value: 'single-family', label: 'Single-family' },
          { value: 'condo', label: 'Condo' },
        ]),
      );
    if (String(input).includes('/listings/cities?'))
      return Promise.resolve(mockJsonResponse(['Boston']));
    return fetchMock(input, init);
  };
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
function useCompactViewport() {
  const original = window.matchMedia;
  window.matchMedia = jest.fn((query) => ({
    ...original(query),
    matches: query === compactLayoutQuery,
  }));
}

test('initial heading uses the API total and All locations, never the page length or California', async () => {
  respondToRoutes();
  renderListings();
  expect(screen.getByRole('heading', { name: 'Finding homes…' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: '0 homes' })).not.toBeInTheDocument();
  await screen.findByRole('heading', { name: '60 homes' });
  expect(screen.getByText('All locations')).toBeInTheDocument();
  expect(screen.getByText('Showing 1–1 of 60')).toBeInTheDocument();
  expect(screen.queryByText('in California')).not.toBeInTheDocument();
});

test('typing stays a draft, sorting preserves it, and explicit search updates the shareable URL', async () => {
  respondToRoutes();
  renderListings('/?city=Boston&offset=20');
  await screen.findByText('123 Canon Drive');
  fireEvent.change(screen.getByLabelText('City or ZIP code'), { target: { value: 'Miami' } });
  expect(screen.getByTestId('location')).toHaveTextContent('city=Boston');
  fireEvent.change(screen.getByLabelText('Sort listings'), { target: { value: 'price:ASC' } });
  await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('sortBy=price'));
  expect(screen.getByLabelText('City or ZIP code')).toHaveValue('Miami');
  expect(screen.getByTestId('location')).toHaveTextContent('city=Boston');
  fireEvent.click(screen.getByRole('button', { name: 'Search listings' }));
  await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('city=Miami'));
  expect(screen.getByTestId('location')).toHaveTextContent('offset=0');
  fireEvent.click(screen.getByRole('button', { name: 'Browser back' }));
  await waitFor(() => expect(screen.getByLabelText('City or ZIP code')).toHaveValue('Boston'));
});

test('rapid search and sort compose before the router commits and POP replaces the command draft', async () => {
  respondToRoutes();
  renderListings('/?limit=2');
  await screen.findByText('123 Canon Drive');
  fireEvent.change(screen.getByLabelText('City or ZIP code'), { target: { value: 'Pasadena' } });
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: 'Search listings' }));
    fireEvent.change(screen.getByLabelText('Sort listings'), { target: { value: 'price:ASC' } });
  });
  await waitFor(() => {
    const url = screen.getByTestId('location');
    expect(url).toHaveTextContent('city=Pasadena');
    expect(url).toHaveTextContent('limit=2');
    expect(url).toHaveTextContent('sortOrder=ASC');
  });
  fireEvent.click(screen.getByRole('button', { name: 'Browser back' }));
  await waitFor(() => expect(screen.getByLabelText('Sort listings')).toHaveValue('listedAt:DESC'));
  fireEvent.change(screen.getByLabelText('Sort listings'), { target: { value: 'squareFeet:ASC' } });
  await waitFor(() =>
    expect(screen.getByTestId('location')).toHaveTextContent('sortBy=squareFeet'),
  );
  expect(screen.getByTestId('location')).toHaveTextContent('city=Pasadena');
});

test('pagination and detail return retain filters, sort and current page', async () => {
  respondToRoutes();
  renderListings('/?city=Boston&sortBy=price&sortOrder=ASC');
  await screen.findByText('123 Canon Drive');
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('offset=20'));
  fireEvent.click(screen.getByRole('link', { name: /view 123 canon drive/i }));
  await screen.findByRole('heading', { name: 'Property details' });
  fireEvent.click(screen.getByRole('button', { name: 'Back to listings' }));
  await screen.findByRole('heading', { name: '60 homes' });
  expect(screen.getByLabelText('City or ZIP code')).toHaveValue('Boston');
  expect(screen.getByTestId('location')).toHaveTextContent('offset=20');
  expect(screen.getByTestId('location')).toHaveTextContent('sortOrder=ASC');
});

test('empty results retain chips and removing one recovers without rebuilding the search', async () => {
  fetchMock.mockResolvedValueOnce(
    mockJsonResponse({ total: 0, limit: 20, offset: 0, results: [] }),
  );
  renderListings('/?city=Boston&beds=5');
  await screen.findByRole('heading', { name: 'No homes match this search.' });
  respondToRoutes();
  fireEvent.click(screen.getByRole('button', { name: 'Remove 5+ beds filter' }));
  await screen.findByText('123 Canon Drive');
  expect(screen.getByTestId('location')).toHaveTextContent('city=Boston');
  expect(screen.getByTestId('location')).not.toHaveTextContent('beds=');
});

test('failed search keeps recovery available and retries successfully', async () => {
  fetchMock.mockResolvedValueOnce(
    mockJsonResponse(
      { error: { code: 'SERVICE_UNAVAILABLE', message: 'Please try again shortly.' } },
      503,
    ),
  );
  renderListings();
  expect(await screen.findByRole('alert')).toHaveTextContent('Please try again shortly.');
  respondToRoutes();
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await screen.findByText('123 Canon Drive');
});

test('a pending search waits for its own results before restoring the requested scroll position', async () => {
  respondToRoutes();
  renderListings('/?city=Boston');
  await screen.findByRole('heading', { name: '60 homes' });
  let finish!: (response: Response) => void;
  fetchMock.mockImplementationOnce(
    () =>
      new Promise<Response>((resolve) => {
        finish = resolve;
      }),
  );
  jest.mocked(window.scrollTo).mockClear();
  fireEvent.change(screen.getByLabelText('City or ZIP code'), { target: { value: 'Pasadena' } });
  fireEvent.click(screen.getByRole('button', { name: 'Search listings' }));
  await screen.findByRole('heading', { name: 'Finding homes…' });
  expect(window.scrollTo).not.toHaveBeenCalled();

  await act(async () => {
    finish(mockJsonResponse({ total: 60, limit: 20, offset: 0, results: [listing] }));
  });
  await screen.findByRole('heading', { name: '60 homes' });
  expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'instant' });
});

test('invalid shared URL is rejected before a network call', () => {
  renderListings('/?minPrice=900&maxPrice=100');
  expect(screen.getByRole('alert')).toHaveTextContent(
    'Minimum price must not exceed maximum price.',
  );
  expect(fetchMock).not.toHaveBeenCalled();
});

test('stale shared page can return to page one while retaining its city', async () => {
  fetchMock.mockResolvedValueOnce(
    mockJsonResponse({ total: 5, limit: 20, offset: 20, results: [] }),
  );
  renderListings('/?city=Boston&offset=20');
  await screen.findByRole('heading', { name: 'No homes on this page' });
  expect(screen.getByText('Showing 0–0 of 5')).toBeInTheDocument();
  respondToRoutes();
  fireEvent.click(screen.getByRole('button', { name: 'Return to first page' }));
  await screen.findByText('123 Canon Drive');
  expect(screen.getByTestId('location')).toHaveTextContent('offset=0');
  expect(screen.getByLabelText('City or ZIP code')).toHaveValue('Boston');
});

test('phone Cancel discards location and sort drafts; Show homes applies them together', async () => {
  useCompactViewport();
  respondToRoutes();
  renderListings('/?city=Boston');
  await screen.findByText('123 Canon Drive');
  fireEvent.click(screen.getByRole('button', { name: 'Search and filters' }));
  fireEvent.change(screen.getByLabelText('City or ZIP code'), { target: { value: 'Irvine' } });
  fireEvent.change(screen.getByLabelText('Sort'), { target: { value: 'price:ASC' } });
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.getByTestId('location')).toHaveTextContent('city=Boston');
  expect(fetchMock).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Search and filters' }));
  const dialog = screen.getByRole('dialog');
  expect(within(dialog).getByLabelText('City or ZIP code')).toHaveValue('Boston');
  fireEvent.change(within(dialog).getByLabelText('City or ZIP code'), {
    target: { value: '02108' },
  });
  fireEvent.change(within(dialog).getByLabelText('Sort'), { target: { value: 'price:ASC' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Show homes' }));
  await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('zipcode=02108'));
  expect(screen.getByTestId('location')).not.toHaveTextContent('city=');
  expect(screen.getByTestId('location')).toHaveTextContent('sortOrder=ASC');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
