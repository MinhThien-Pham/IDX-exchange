import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import LocationInput from './LocationInput';
import { mockJsonResponse } from '../../../test/fixtures';

const fetchMock = jest.fn<Promise<Response>, Parameters<typeof fetch>>();
beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock;
});
function setup() {
  const submit = jest.fn();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Form() {
    const [value, setValue] = useState('');
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <LocationInput value={value} onChange={setValue} />
        <button type="submit">Search</button>
      </form>
    );
  }
  render(
    <QueryClientProvider client={client}>
      <Form />
    </QueryClientProvider>,
  );
  const input = screen.getByRole('combobox', { name: 'City or ZIP code' });
  fireEvent.focus(input);
  return { input, submit };
}

test('debounces city prefixes and selecting a suggestion only completes the draft', async () => {
  fetchMock.mockResolvedValue(mockJsonResponse(['Boston']));
  const { input, submit } = setup();
  for (const value of ['B', 'Bo', 'Bos']) fireEvent.change(input, { target: { value } });
  const option = await screen.findByRole('option', { name: 'Boston' });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock).toHaveBeenCalledWith(
    '/api/v1/listings/cities?q=bos',
    expect.objectContaining({ signal: expect.any(AbortSignal) }),
  );
  fireEvent.mouseDown(option);
  fireEvent.click(option);
  expect(input).toHaveValue('Boston');
  expect(input).toHaveAttribute('aria-expanded', 'false');
  expect(submit).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Search' }));
  expect(submit).toHaveBeenCalledTimes(1);
});

test('arrows select a city, Enter accepts it, and Escape dismisses without clearing the input', async () => {
  fetchMock.mockResolvedValue(mockJsonResponse(['Boston', 'Boulder']));
  const { input, submit } = setup();
  fireEvent.change(input, { target: { value: 'Bo' } });
  await screen.findByRole('option', { name: 'Boston' });
  fireEvent.keyDown(input, { key: 'ArrowDown' });
  expect(screen.getByRole('option', { name: 'Boston' })).toHaveAttribute('aria-selected', 'true');
  fireEvent.keyDown(input, { key: 'ArrowDown' });
  fireEvent.keyDown(input, { key: 'ArrowUp' });
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(input).toHaveValue('Boston');
  expect(submit).not.toHaveBeenCalled();
  fireEvent.change(input, { target: { value: 'Bo' } });
  await screen.findByRole('option', { name: 'Boston' });
  fireEvent.keyDown(input, { key: 'Escape' });
  expect(input).toHaveValue('Bo');
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
});

test('cancels an obsolete request and never presents its late cities for the newer prefix', async () => {
  let finish!: (response: Response) => void;
  let obsoleteSignal: AbortSignal | undefined;
  fetchMock.mockImplementation((input, init) => {
    if (String(input).endsWith('q=bo')) {
      obsoleteSignal = init?.signal ?? undefined;
      return new Promise((resolve) => {
        finish = resolve;
      });
    }
    return Promise.resolve(mockJsonResponse(['Boston']));
  });
  const { input } = setup();
  fireEvent.change(input, { target: { value: 'Bo' } });
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  fireEvent.change(input, { target: { value: 'Bos' } });
  expect(obsoleteSignal?.aborted).toBe(true);
  await screen.findByRole('option', { name: 'Boston' });
  await act(async () => finish(mockJsonResponse(['Boulder'])));
  expect(screen.queryByRole('option', { name: 'Boulder' })).not.toBeInTheDocument();
});

test('ZIP input skips city requests and a suggestion failure leaves manual search available', async () => {
  fetchMock.mockResolvedValue(mockJsonResponse(null, 503));
  const { input } = setup();
  fireEvent.change(input, { target: { value: '02108' } });
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  expect(fetchMock).not.toHaveBeenCalled();
  fireEvent.change(input, { target: { value: 'Bos' } });
  await screen.findByText('City suggestions are unavailable. You can still search.');
  expect(screen.getByRole('button', { name: 'Search' })).toBeEnabled();
});
