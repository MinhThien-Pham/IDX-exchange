import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import './Pagination.css';

export function getPageItems(currentPage: number, totalPages: number): (number | string)[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  if (currentPage <= 4) return [1, 2, 3, 4, 5, 'right-ellipsis', totalPages];
  if (currentPage >= totalPages - 3)
    return [
      1,
      'left-ellipsis',
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
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

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  compact = false,
  disabled = false,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  compact?: boolean;
  disabled?: boolean;
}) {
  if (totalPages <= 1 && !compact) return null;
  const validPage = currentPage >= 1 && currentPage <= totalPages;
  return (
    <nav
      className={`pagination ${compact ? 'pagination-compact' : ''}`}
      aria-label="Property pagination"
    >
      <button
        className="button"
        type="button"
        aria-label={compact ? 'Previous page' : 'Previous'}
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={disabled || currentPage <= 1 || totalPages === 0}
      >
        {compact ? (
          <ChevronLeft aria-hidden="true" />
        ) : (
          <>
            <ArrowLeft aria-hidden="true" />
            Previous
          </>
        )}
      </button>
      {compact ? (
        <span className="page-counter" aria-live="polite">
          {disabled || (!validPage && totalPages > 0)
            ? '—'
            : `${totalPages ? currentPage : 0} / ${totalPages}`}
        </span>
      ) : (
        getPageItems(currentPage, totalPages).map((item) =>
          typeof item === 'string' ? (
            <span key={item} className="pagination-ellipsis">
              …
            </span>
          ) : (
            <button
              className={`button ${item === currentPage ? 'active' : ''}`}
              type="button"
              key={item}
              aria-current={item === currentPage ? 'page' : undefined}
              onClick={() => onPageChange(item)}
              disabled={disabled}
            >
              {item}
            </button>
          ),
        )
      )}
      <button
        className="button"
        type="button"
        aria-label={compact ? 'Next page' : 'Next'}
        onClick={() => onPageChange(currentPage + 1)}
        disabled={disabled || currentPage >= totalPages}
      >
        {compact ? (
          <ChevronRight aria-hidden="true" />
        ) : (
          <>
            Next
            <ArrowRight aria-hidden="true" />
          </>
        )}
      </button>
    </nav>
  );
}
