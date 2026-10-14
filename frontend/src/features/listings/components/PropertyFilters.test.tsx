import { fireEvent, render as renderComponent, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { mockJsonResponse } from '../../../test/fixtures';
import { searchListingsSchema } from '@idx/contracts';
import PropertyFilters from './PropertyFilters';

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue(
    mockJsonResponse([
      { value: 'single-family', label: 'Single-family' },
      { value: 'condo', label: 'Condo' },
    ]),
  );
});
function render(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderComponent(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

test('sheet applies location, fractional bathrooms and sort together with ZIP leading zero intact', () => {
  const onApply = jest.fn();
  render(
    <PropertyFilters
      variant="sheet"
      query={searchListingsSchema.parse({ city: 'Boston', offset: 20 })}
      onApply={onApply}
    />,
  );
  fireEvent.change(screen.getByLabelText('City or ZIP code'), { target: { value: ' 02108 ' } });
  fireEvent.change(screen.getByLabelText('Min price'), { target: { value: '300000' } });
  fireEvent.click(
    within(screen.getByRole('group', { name: 'Bathrooms' })).getByRole('button', { name: '2.5+' }),
  );
  fireEvent.change(screen.getByLabelText('Sort'), { target: { value: 'price:ASC' } });
  fireEvent.click(screen.getByRole('button', { name: 'Show homes' }));
  expect(onApply).toHaveBeenCalledWith(
    expect.objectContaining({
      city: undefined,
      zipcode: '02108',
      minPrice: 300000,
      baths: 2.5,
      sortBy: 'price',
      sortOrder: 'ASC',
      offset: 0,
    }),
  );
});

test('sidebar validates price bounds before applying and preserves the applied location', () => {
  const onApply = jest.fn();
  render(
    <PropertyFilters
      query={searchListingsSchema.parse({ city: 'Boston', zipcode: '02108' })}
      onApply={onApply}
    />,
  );
  expect(screen.queryByLabelText('City or ZIP code')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Min price'), { target: { value: '900000' } });
  fireEvent.change(screen.getByLabelText('Max price'), { target: { value: '300000' } });
  fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }));
  expect(screen.getByRole('alert')).toHaveTextContent(
    'Minimum price must not exceed maximum price.',
  );
  expect(onApply).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Min price'), { target: { value: '-1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }));
  expect(onApply).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Min price'), { target: { value: '100000' } });
  fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }));
  expect(onApply).toHaveBeenCalledWith(
    expect.objectContaining({ city: 'Boston', zipcode: '02108', minPrice: 100000 }),
  );
});

test('Reset in the sheet only resets its draft; Cancel does not apply it', () => {
  const onApply = jest.fn();
  const onCancel = jest.fn();
  render(
    <PropertyFilters
      variant="sheet"
      query={searchListingsSchema.parse({ city: 'Boston', beds: 4, minPrice: 100 })}
      onApply={onApply}
      onCancel={onCancel}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }));
  expect(screen.getByLabelText('Min price')).toHaveValue(null);
  expect(screen.getByLabelText('City or ZIP code')).toHaveValue('Boston');
  expect(onApply).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(onCancel).toHaveBeenCalledTimes(1);
  expect(onApply).not.toHaveBeenCalled();
});

test('sidebar Reset immediately clears refinements while keeping location and sorting', () => {
  const onApply = jest.fn();
  render(
    <PropertyFilters
      query={searchListingsSchema.parse({
        city: 'Boston',
        beds: 4,
        minPrice: 100,
        homeType: 'condo',
        sortBy: 'price',
        sortOrder: 'ASC',
      })}
      onApply={onApply}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }));
  expect(onApply).toHaveBeenCalledWith(
    expect.objectContaining({
      city: 'Boston',
      beds: undefined,
      minPrice: undefined,
      homeType: undefined,
      sortBy: 'price',
      sortOrder: 'ASC',
    }),
  );
});

test('home-type labels use available inventory and apply a canonical key with a fresh first page', async () => {
  const onApply = jest.fn();
  render(
    <PropertyFilters
      query={searchListingsSchema.parse({ city: 'Boston', offset: 20 })}
      onApply={onApply}
    />,
  );
  await screen.findByRole('option', { name: 'Condo' });
  fireEvent.change(screen.getByLabelText('Home type'), { target: { value: 'condo' } });
  expect(onApply).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }));
  expect(onApply).toHaveBeenCalledWith(
    expect.objectContaining({ homeType: 'condo', city: 'Boston', offset: 0 }),
  );
});

test('a failed home-type lookup preserves the applied type and can be retried', async () => {
  jest.mocked(global.fetch).mockResolvedValueOnce(mockJsonResponse(null, 503));
  const onApply = jest.fn();
  render(
    <PropertyFilters query={searchListingsSchema.parse({ homeType: 'condo' })} onApply={onApply} />,
  );
  fireEvent.click(await screen.findByRole('button', { name: 'Retry home types' }));
  await screen.findByRole('option', { name: 'Condo' });
  expect(screen.getByLabelText('Home type')).toHaveValue('condo');
  expect(onApply).not.toHaveBeenCalled();
});
