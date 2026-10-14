import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import PropertyImageGallery from './PropertyImageGallery';

function Gallery() {
  const [open, setOpen] = useState(false);
  return (
    <PropertyImageGallery
      photos={[
        'https://example.com/1.jpg',
        'https://example.com/2.jpg',
        'https://example.com/3.jpg',
      ]}
      address="123 Canon Drive"
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
    />
  );
}

test('gallery opens at the selected photo, handles one keyboard step, and restores focus and scroll lock', () => {
  render(<Gallery />);
  const opener = screen.getByRole('button', { name: 'Enlarge property photo 2' });
  opener.focus();
  fireEvent.click(opener);
  const dialog = screen.getByRole('dialog');
  const close = within(dialog).getByRole('button', { name: 'Close photos' });
  expect(close).toHaveFocus();
  expect(document.body.style.overflow).toBe('hidden');
  expect(within(dialog).getByText('2 / 3')).toBeInTheDocument();
  fireEvent.keyDown(close, { key: 'ArrowLeft' });
  expect(within(dialog).getByText('1 / 3')).toBeInTheDocument();
  fireEvent.keyDown(close, { key: 'ArrowRight' });
  expect(within(dialog).getByText('2 / 3')).toBeInTheDocument();
  fireEvent(dialog, new Event('cancel', { cancelable: true }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(document.body.style.overflow).toBe('');
  expect(opener).toHaveFocus();
});

test('photo navigation stops at the ends and never adds dot indicators', () => {
  render(<Gallery />);
  expect(screen.getByRole('button', { name: 'Previous photo' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Next photo' }));
  expect(screen.getByText('2 / 3')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Next photo' }));
  expect(screen.getByRole('button', { name: 'Next photo' })).toBeDisabled();
  expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
});

test('a listing without images cannot open an empty viewer', () => {
  render(
    <PropertyImageGallery
      photos={[]}
      address="Home"
      open={false}
      onOpen={jest.fn()}
      onClose={jest.fn()}
    />,
  );
  expect(screen.getByText('Photos unavailable')).toBeInTheDocument();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
