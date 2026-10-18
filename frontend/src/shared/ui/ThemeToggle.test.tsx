import { fireEvent, render, screen } from '@testing-library/react';
import ThemeToggle from './ThemeToggle';

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});
test('theme follows the system initially, persists an explicit choice, and retains another input draft', () => {
  const original = window.matchMedia;
  window.matchMedia = jest.fn((query) => ({
    ...original(query),
    matches: query === '(prefers-color-scheme: dark)',
  }));
  render(
    <>
      <input aria-label="Draft" defaultValue="Pasadena" />
      <ThemeToggle />
    </>,
  );
  const toggle = screen.getByRole('switch', { name: 'Dark theme' });
  expect(toggle).toHaveAttribute('aria-checked', 'true');
  fireEvent.click(toggle);
  expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  expect(localStorage.getItem('idx-theme')).toBe('light');
  expect(screen.getByLabelText('Draft')).toHaveValue('Pasadena');
});
test('an existing theme choice takes precedence over the system', () => {
  localStorage.setItem('idx-theme', 'dark');
  render(<ThemeToggle />);
  expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
});
test('blocked browser storage does not prevent theme switching', () => {
  const get = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  const set = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  render(<ThemeToggle />);
  fireEvent.click(screen.getByRole('switch'));
  expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  get.mockRestore();
  set.mockRestore();
});
