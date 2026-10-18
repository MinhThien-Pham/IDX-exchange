import { fireEvent, render, screen } from '@testing-library/react';
import PropertyImageGallery from './PropertyImageGallery';

test('photo viewer supports keyboard navigation, focus containment, Escape and returning focus', () => {
  render(
    <PropertyImageGallery
      photos={['https://example.com/1.jpg', 'https://example.com/2.jpg']}
      address="123 Canon Drive"
    />,
  );
  const opener = screen.getByRole('button', { name: 'Open property photo viewer' });
  opener.focus();
  fireEvent.keyDown(opener, { key: 'Enter' });
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  const close = screen.getByRole('button', { name: 'Close photo viewer' });
  expect(close).toHaveFocus();
  fireEvent.keyDown(window, { key: 'ArrowRight' });
  expect(screen.getByRole('img', { name: '123 Canon Drive 2' })).toHaveAttribute(
    'src',
    'https://example.com/2.jpg',
  );
  fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
  expect(screen.getByRole('button', { name: 'Next photo' })).toHaveFocus();
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(opener).toHaveFocus();
});
