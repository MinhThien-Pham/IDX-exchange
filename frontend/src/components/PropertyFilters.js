import { useState } from 'react';
import './PropertyFilters.css';

const initialFilters = {
    city: '',
    zipcode: '',
    minPrice: '',
    maxPrice: '',
    beds: '',
    baths: '',
};

function cleanFilters(filters) {
    const cleaned = {};

    Object.keys(filters).forEach((key) => {
        if (filters[key] !== '') {
            cleaned[key] = filters[key];
        }
    });

    return cleaned;
}

function PropertyFilters({ onSearch, onClear }) {
    const [filters, setFilters] = useState(initialFilters);

    function handleChange(event) {
        const { name, value } = event.target;

        setFilters((currentFilters) => ({
            ...currentFilters,
            [name]: value,
        }));
    }

    function handleSubmit(event) {
        event.preventDefault();
        onSearch(cleanFilters(filters));
    }

    function handleClear() {
        setFilters(initialFilters);
        onClear();
    }

    return (
        <form className="property-filters" onSubmit={handleSubmit}>
            <div className="filter-grid">
                <label>
                    City
                    <input
                        name="city"
                        value={filters.city}
                        onChange={handleChange}
                        placeholder="e.g. Beverly Hills"
                    />
                </label>

                <label>
                    ZIP Code
                    <input
                        name="zipcode"
                        value={filters.zipcode}
                        onChange={handleChange}
                        placeholder="e.g. 90210"
                    />
                </label>

                <label>
                    Min Price
                    <input
                        name="minPrice"
                        type="number"
                        value={filters.minPrice}
                        onChange={handleChange}
                        placeholder="e.g. 300000"
                    />
                </label>

                <label>
                    Max Price
                    <input
                        name="maxPrice"
                        type="number"
                        value={filters.maxPrice}
                        onChange={handleChange}
                        placeholder="e.g. 1000000"
                    />
                </label>

                <label>
                    Beds
                    <select name="beds" value={filters.beds} onChange={handleChange}>
                        <option value="">Any</option>
                        <option value="1">1+</option>
                        <option value="2">2+</option>
                        <option value="3">3+</option>
                        <option value="4">4+</option>
                        <option value="5">5+</option>
                    </select>
                </label>

                <label>
                    Baths
                    <select name="baths" value={filters.baths} onChange={handleChange}>
                        <option value="">Any</option>
                        <option value="1">1+</option>
                        <option value="2">2+</option>
                        <option value="3">3+</option>
                        <option value="4">4+</option>
                        <option value="5">5+</option>
                    </select>
                </label>
            </div>

            <div className="filter-actions">
                <button type="submit">Search</button>
                <button type="button" className="clear-button" onClick={handleClear}>
                    Clear Filters
                </button>
            </div>
        </form>
    );
}

export default PropertyFilters;