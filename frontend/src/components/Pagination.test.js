import { fireEvent, render, screen } from '@testing-library/react';
import Pagination, { getPageItems } from './Pagination';

describe('Pagination', () => {
    test('hides pagination when there is only one page', () => {
        render(
            <Pagination
                currentPage={1}
                totalPages={1}
                onPageChange={jest.fn()}
            />
        );

        expect(
            screen.queryByRole('navigation', {
                name: 'Property pagination',
            })
        ).not.toBeInTheDocument();
    });

    test('disables Previous on the first page', () => {
        render(
            <Pagination
                currentPage={1}
                totalPages={5}
                onPageChange={jest.fn()}
            />
        );

        expect(
            screen.getByRole('button', { name: 'Previous' })
        ).toBeDisabled();

        expect(
            screen.getByRole('button', { name: 'Next' })
        ).not.toBeDisabled();
    });

    test('disables Next on the last page', () => {
        render(
            <Pagination
                currentPage={5}
                totalPages={5}
                onPageChange={jest.fn()}
            />
        );

        expect(
            screen.getByRole('button', { name: 'Next' })
        ).toBeDisabled();
    });

    test('changes page when a page number is clicked', () => {
        const onPageChange = jest.fn();

        render(
            <Pagination
                currentPage={1}
                totalPages={5}
                onPageChange={onPageChange}
            />
        );

        fireEvent.click(
            screen.getByRole('button', { name: '3' })
        );

        expect(onPageChange).toHaveBeenCalledWith(3);
    });

    test('changes page when Next is clicked', () => {
        const onPageChange = jest.fn();

        render(
            <Pagination
                currentPage={2}
                totalPages={5}
                onPageChange={onPageChange}
            />
        );

        fireEvent.click(
            screen.getByRole('button', { name: 'Next' })
        );

        expect(onPageChange).toHaveBeenCalledWith(3);
    });

    test('shows ellipsis for a middle page', () => {
        render(
            <Pagination
                currentPage={5}
                totalPages={24}
                onPageChange={jest.fn()}
            />
        );

        expect(screen.getByText('1')).toBeInTheDocument();
        expect(screen.getByText('4')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument();
        expect(screen.getByText('6')).toBeInTheDocument();
        expect(screen.getByText('24')).toBeInTheDocument();

        expect(screen.getAllByText('...')).toHaveLength(2);
    });

    test('does not duplicate the last page near the end', () => {
        const items = getPageItems(23, 24);

        expect(
            items.filter((item) => item === 24)
        ).toHaveLength(1);
    });
});