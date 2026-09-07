import { useState, useEffect } from 'react';
import { alert } from 'tiny-essentials/webTemplates/bootstrap/5.3/html/BootstrapDialogs';

/**
 * @template T
 * @typedef {import('react').SetStateAction<T>} SetStateAction
 */

/**
 * @template T
 * @typedef {import('react').Dispatch<T>} Dispatch
 */

/**
 * @param {{ onSearchSubmit: (query: string, mode: string) => void, initialQuery: string, initialMode: string, isLoading: boolean }} props
 */
export const SearchBar = ({ onSearchSubmit, initialQuery, initialMode, isLoading }) => {
  /** @type {ReactSetStateAction<string>} */
  const [inputValue, setInputValue] = useState(initialQuery);

  /** @type {ReactSetStateAction<string>} */
  const [mode, setMode] = useState(initialMode || 'api');

  const localFavesEnabled = localStorage.getItem('app_localFavesEnabled') === 'true';

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInputValue(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode(initialMode || 'api');
  }, [initialMode]);

  /**
   * @param {import('react').ChangeEvent<HTMLSelectElement>} event
   */
  const handleModeChange = (event) => {
    const newMode = event.target.value;
    setMode(newMode);

    if (newMode === 'local_fav') {
      const hasSeenAlert = localStorage.getItem('app_localFavAlertSeen');

      if (!hasSeenAlert) {
        alert(
          "Philomena's complex query syntax (like AND/OR/NOT) may not work identically in the local database search.",
        );
        localStorage.setItem('app_localFavAlertSeen', 'true');
      }
    }

    // Auto-submits the search immediately upon changing the select mode
    onSearchSubmit(inputValue, newMode);
  };

  /**
   * @param {import('react').FormEvent<HTMLFormElement>} event
   */
  const handleFormSubmit = (event) => {
    event.preventDefault();
    onSearchSubmit(inputValue, mode);
  };

  return (
    <div className="d-flex flex-column flex-grow-1 mx-lg-4 my-2 my-lg-0">
      <form onSubmit={handleFormSubmit} className="d-flex w-100">
        {localFavesEnabled && (
          <select
            className="form-select form-select-sm bg-dark text-light border-secondary me-2 fw-semibold"
            style={{ width: 'auto', minWidth: '130px' }}
            value={mode}
            onChange={handleModeChange}
            disabled={isLoading}
          >
            <option value="api">API</option>
            <option value="local_fav">Local Faves</option>
          </select>
        )}

        <input
          type="search"
          className="form-control form-control-sm me-2 bg-dark text-light border-secondary"
          placeholder="Search tags (e.g., safe, pony)..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={isLoading}
        />

        <button type="submit" className="btn btn-primary btn-sm px-3 fw-bold" disabled={isLoading}>
          Search
        </button>
      </form>
    </div>
  );
};
