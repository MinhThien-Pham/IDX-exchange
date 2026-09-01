import { fireEvent, render, screen } from '@testing-library/react';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
    useNavigate: () => mockNavigate,
}));

const PropertyCard = require('./PropertyCard').default;

const property = {
    L_ListingID: '1001',
    L_SystemPrice: 900000,
    L_Address: '123 Canon Drive',
    L_City: 'Beverly Hills',
    L_State: 'CA',
    L_Keyword2: 3,
    LM_Dec_3: 2.5,
    LM_Int2_3: 1800,
    L_Photos: JSON.stringify(['https://example.com/photo.jpg']),
};

function renderCard() {
    render(<PropertyCard property={property} />);
}

describe('PropertyCard', () => {
    beforeEach(() => {
        mockNavigate.mockClear();
    });

    test('renders property data', () => {
        renderCard();

        expect(screen.getByText('$900,000')).toBeInTheDocument();
        expect(screen.getByText('123 Canon Drive')).toBeInTheDocument();
        expect(screen.getByText('Beverly Hills, CA')).toBeInTheDocument();
        expect(screen.getByText('3 beds')).toBeInTheDocument();
        expect(screen.getByText('2.5 baths')).toBeInTheDocument();
        expect(screen.getByText('1800 sqft')).toBeInTheDocument();
    });

    test('clicking the card navigates to the property detail path', () => {
        renderCard();

        fireEvent.click(screen.getByRole('link', { name: /view 123 canon drive/i }));

        expect(mockNavigate).toHaveBeenCalledWith('/property/1001', {
            state: {
                listingsState: undefined,
            },
        });
    });
});
