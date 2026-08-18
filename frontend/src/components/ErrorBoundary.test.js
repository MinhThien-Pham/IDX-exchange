import { render, screen } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';

function BrokenComponent() {
    throw new Error('Test render error');
}

describe('ErrorBoundary', () => {
    test('shows recovery UI when a child crashes', () => {
        const consoleError = jest
            .spyOn(console, 'error')
            .mockImplementation(() => { });

        render(
            <ErrorBoundary>
                <BrokenComponent />
            </ErrorBoundary>
        );

        expect(
            screen.getByRole('heading', {
                name: 'Something went wrong',
            })
        ).toBeInTheDocument();

        expect(
            screen.getByRole('button', {
                name: 'Refresh Page',
            })
        ).toBeInTheDocument();

        consoleError.mockRestore();
    });
});