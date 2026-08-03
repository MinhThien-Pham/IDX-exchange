import './Pagination.css';

export function getPageItems(currentPage, totalPages) {
    if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    if (currentPage <= 4) {
        return [1, 2, 3, 4, 5, 'right-ellipsis', totalPages];
    }

    if (currentPage >= totalPages - 3) {
        return [
            1,
            'left-ellipsis',
            totalPages - 4,
            totalPages - 3,
            totalPages - 2,
            totalPages - 1,
            totalPages,
        ];
    }

    return [
        1,
        'left-ellipsis',
        currentPage - 1,
        currentPage,
        currentPage + 1,
        'right-ellipsis',
        totalPages,
    ];
}

function Pagination({ currentPage, totalPages, onPageChange }) {
    if (totalPages <= 1) {
        return null;
    }

    const items = getPageItems(currentPage, totalPages);

    return (
        <nav className="pagination" aria-label="Property pagination">
            <button
                type="button"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
            >
                Previous
            </button>

            {items.map((item) =>
                typeof item === 'string' ? (
                    <span key={item} className="pagination-ellipsis">
                        ...
                    </span>
                ) : (
                    <button
                        type="button"
                        key={item}
                        className={item === currentPage ? 'active' : ''}
                        aria-current={item === currentPage ? 'page' : undefined}
                        onClick={() => onPageChange(item)}
                    >
                        {item}
                    </button>
                )
            )}

            <button
                type="button"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
            >
                Next
            </button>
        </nav>
    );
}

export default Pagination;