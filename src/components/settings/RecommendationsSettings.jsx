import { useState, useEffect } from 'react';

/**
 * @template T
 * @typedef {import('react').SetStateAction<T>} SetStateAction
 */

/**
 * @template T
 * @typedef {import('react').Dispatch<T>} Dispatch
 */

export const RecommendationsSettings = () => {
  /** @type {ReactSetStateAction<boolean>} */
  const [enableRecs, setEnableRecs] = useState(() => {
    return localStorage.getItem('app_enableRecs') === 'true';
  });

  /** @type {ReactSetStateAction<number>} */
  const [recTagLimit, setRecTagLimit] = useState(() => {
    return parseInt(localStorage.getItem('app_recTagLimit') || '5', 10);
  });

  /** @type {ReactSetStateAction<number>} */
  const [recDaysLimit, setRecDaysLimit] = useState(() => {
    const saved = localStorage.getItem('app_recDaysLimit');
    return saved ? parseInt(saved, 10) : 3;
  });

  useEffect(() => {
    localStorage.setItem('app_enableRecs', enableRecs.toString());
  }, [enableRecs]);

  useEffect(() => {
    localStorage.setItem('app_recTagLimit', recTagLimit.toString());
  }, [recTagLimit]);

  useEffect(() => {
    localStorage.setItem('app_recDaysLimit', recDaysLimit.toString());
  }, [recDaysLimit]);

  return (
    <div className="p-3">
      <h4 className="fw-bold mb-4" style={{ color: 'var(--app-text)' }}>
        Recommendations
      </h4>

      <div className="form-check form-switch mb-4">
        <input
          type="checkbox"
          className="form-check-input"
          id="enableRecsCheck"
          checked={enableRecs}
          onChange={(e) => setEnableRecs(e.target.checked)}
        />
        <label
          className="form-check-label fw-bold"
          htmlFor="enableRecsCheck"
          style={{ color: 'var(--app-text)' }}
        >
          Enable Recommendations Sidebar
        </label>
        <div className="form-text" style={{ color: 'var(--app-text)' }}>
          Shows a "Theater Mode" sidebar with similar content when viewing an image.
        </div>
      </div>

      <div className="mb-4">
        <label className="form-label fw-bold" style={{ color: 'var(--app-text)' }}>
          Tags to use for random querying (Max 10): {recTagLimit}
        </label>
        <input
          type="range"
          className="form-range"
          min="1"
          max="10"
          disabled={!enableRecs}
          value={recTagLimit}
          onChange={(e) => setRecTagLimit(parseInt(e.target.value, 10))}
        />
      </div>

      <div className="mb-4">
        <label className="form-label fw-bold" style={{ color: 'var(--app-text)' }}>
          Recent Days Limit
        </label>
        <div className="input-group">
          <input
            type="number"
            className="form-control"
            min="1"
            disabled={!enableRecs}
            value={recDaysLimit}
            onChange={(e) => setRecDaysLimit(Math.max(1, parseInt(e.target.value, 10) || 1))}
            style={{ backgroundColor: 'var(--app-bg)', color: 'var(--app-text)' }}
          />
          <span
            className="input-group-text"
            style={{ backgroundColor: 'var(--app-surface)', color: 'var(--app-text)' }}
          >
            days ago
          </span>
        </div>
        <div className="form-text" style={{ color: 'var(--app-text)' }}>
          Only recommends images uploaded within this number of days.
        </div>
      </div>
    </div>
  );
};
