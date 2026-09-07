import { useEffect, useState } from 'react';

/**
 * @template T
 * @typedef {import('react').SetStateAction<T>} SetStateAction
 */

/**
 * @template T
 * @typedef {import('react').Dispatch<T>} Dispatch
 */

/**
 * @param {{ currentPage: number, isHomepage: boolean, totalPages: number, onPageChange: (page: number) => void, className?: string }} props
 */
export const PaginationBar = ({ currentPage, isHomepage, totalPages, onPageChange, className }) => {
  /** @type {ReactSetStateAction<string>} */
  const [jumpValue, setJumpValue] = useState(currentPage.toString());

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setJumpValue(currentPage.toString());
  }, [currentPage]);

  /**
   * @param {number} total
   * @param {number} current
   * @returns {(number|string)[]}
   */
  const getPageNumbers = (total, current) => {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (current <= 4) return [1, 2, 3, 4, 5, '...', total];
    if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
    return [1, '...', current - 1, current, current + 1, '...', total];
  };

  const handleJump = () => {
    /** @type {number} */
    const val = parseInt(jumpValue, 10);
    if (!isNaN(val) && val >= 1 && val <= totalPages) {
      onPageChange(val);
    } else {
      setJumpValue(currentPage.toString());
    }
  };

  /** @type {(number|string)[]} */
  const pages = getPageNumbers(totalPages, currentPage);

  return (
    <div
      className={`d-flex flex-column flex-md-row justify-content-center align-items-center${className ? ` ${className}` : ''}`}
    >
      <ul className="pagination mb-0 me-md-3">
        <li className={`page-item ${isHomepage ? 'disabled' : ''}`}>
          <button
            className="page-link"
            onClick={() => onPageChange(currentPage - 1)}
            aria-label="Previous"
          >
            <span aria-hidden="true">&laquo;</span>
          </button>
        </li>

        {pages.map((num, idx) => (
          <li
            key={idx}
            className={`page-item ${num === currentPage ? 'active' : ''} ${num === '...'} ? 'disabled' : ''}`}
          >
            <button
              className="page-link"
              onClick={() => typeof num === 'number' && onPageChange(num)}
              disabled={num === '...'}
            >
              {num}
            </button>
          </li>
        ))}

        <li className={`page-item ${currentPage >= totalPages ? 'disabled' : ''}`}>
          <button
            className="page-link"
            onClick={() => onPageChange(currentPage + 1)}
            aria-label="Next"
          >
            <span aria-hidden="true">&raquo;</span>
          </button>
        </li>
      </ul>

      <div
        className="d-flex align-items-center mt-3 mt-md-0 p-1 rounded border"
        style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
      >
        <span className="text-muted mx-2 small fw-semibold">Page:</span>
        <input
          type="number"
          className="form-control form-control-sm text-center page-jump-input"
          style={{ width: '70px', padding: '0.25rem' }}
          min={1}
          max={totalPages}
          value={jumpValue}
          onChange={(e) => setJumpValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleJump()}
        />
        <span className="text-muted mx-2 small fw-semibold">/ {totalPages}</span>
        <button className="btn btn-sm btn-secondary me-1" onClick={handleJump}>
          Go
        </button>
      </div>
    </div>
  );
};
