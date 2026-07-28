import { fireEvent, render, screen } from '@testing-library/react';
import PropertyFilters from './PropertyFilters';

describe('PropertyFilters', () => {
    test('renders all filter inputs', () => {
        render(<PropertyFilters onSearch={jest.fn()} onClear={jest.fn()} />);

        expect(screen.getByLabelText(/city/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/zip code/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/min price/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/max price/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/beds/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/baths/i)).toBeInTheDocument();
    });

    test('submits only non-empty filters', () => {
        const onSearch = jest.fn();

        render(<PropertyFilters onSearch={onSearch} onClear={jest.fn()} />);

        fireEvent.change(screen.getByLabelText(/city/i), {
            target: { value: 'Beverly Hills' },
        });

        fireEvent.change(screen.getByLabelText(/min price/i), {
            target: { value: '300000' },
        });

        fireEvent.change(screen.getByLabelText(/beds/i), {
            target: { value: '3' },
        });

        fireEvent.click(screen.getByRole('button', { name: /search/i }));

        expect(onSearch).toHaveBeenCalledWith({
            city: 'Beverly Hills',
            minPrice: '300000',
            beds: '3',
        });
    });

    test('clear filters resets form and calls onClear', () => {
        const onClear = jest.fn();

        render(<PropertyFilters onSearch={jest.fn()} onClear={onClear} />);

        const cityInput = screen.getByLabelText(/city/i);

        fireEvent.change(cityInput, {
            target: { value: 'Beverly Hills' },
        });

        expect(cityInput).toHaveValue('Beverly Hills');

        fireEvent.click(screen.getByRole('button', { name: /clear filters/i }));

        expect(cityInput).toHaveValue('');
        expect(onClear).toHaveBeenCalled();
    });
});