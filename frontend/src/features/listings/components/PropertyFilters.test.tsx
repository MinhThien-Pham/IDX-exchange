import { fireEvent, render, screen } from '@testing-library/react';
import PropertyFilters from './PropertyFilters';

test('submits trimmed, validated numeric filters and retains ZIP leading zero', () => {
  const onSearch = jest.fn();
  render(<PropertyFilters onSearch={onSearch} onClear={jest.fn()} />);
  fireEvent.change(screen.getByLabelText('City'), { target: { value: ' Boston ' } });
  fireEvent.change(screen.getByLabelText('ZIP Code'), { target: { value: '02108' } });
  fireEvent.change(screen.getByLabelText('Min Price'), { target: { value: '300000' } });
  fireEvent.change(screen.getByLabelText('Beds'), { target: { value: '3' } });
  fireEvent.click(screen.getByRole('button', { name: 'Search' }));
  expect(onSearch).toHaveBeenCalledWith(
    expect.objectContaining({ city: 'Boston', zipcode: '02108', minPrice: 300000, beds: 3 }),
  );
});

test('rejects reversed and negative price bounds without sending a request', () => {
  const onSearch = jest.fn();
  render(<PropertyFilters onSearch={onSearch} onClear={jest.fn()} />);
  fireEvent.change(screen.getByLabelText('Min Price'), { target: { value: '900000' } });
  fireEvent.change(screen.getByLabelText('Max Price'), { target: { value: '300000' } });
  fireEvent.click(screen.getByRole('button', { name: 'Search' }));
  expect(screen.getByRole('alert')).toHaveTextContent(
    'Minimum price must not exceed maximum price.',
  );
  expect(onSearch).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Min Price'), { target: { value: '-1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Search' }));
  expect(screen.getByRole('alert')).toBeInTheDocument();
  expect(onSearch).not.toHaveBeenCalled();
});

test('clear resets the form and calls the URL reset handler', () => {
  const onClear = jest.fn();
  render(
    <PropertyFilters initialValues={{ city: 'Boston' }} onSearch={jest.fn()} onClear={onClear} />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Clear Filters' }));
  expect(screen.getByLabelText('City')).toHaveValue('');
  expect(onClear).toHaveBeenCalledTimes(1);
});
