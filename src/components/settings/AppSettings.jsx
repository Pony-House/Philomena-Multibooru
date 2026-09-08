import { useState, useEffect, useRef } from 'react';
import { alert, confirm } from 'tiny-essentials/webTemplates/bootstrap/5.3/html/BootstrapDialogs';

import { getActiveAccounts, updateSystemSettings } from '../../services/api/System.js';
import {
  exportLocalFaves,
  clearLocalFaves,
  importLocalFaves,
} from '../../services/api/LocalFaves.js';

/**
 * @template T
 * @typedef {import('react').SetStateAction<T>} SetStateAction
 */

/**
 * @template T
 * @typedef {import('react').Dispatch<T>} Dispatch
 */

/**
 * @template T
 * @typedef {import('react').Ref<T>} Ref
 */

/**
 * @param {Object} config
 * @param {boolean} config.isLoading
 * @param {number} config.maxItemsLimit
 * @param {boolean} config.isPersistent
 * @param {Dispatch<SetStateAction<boolean>>} config.setIsPersistent
 * @param {Dispatch<SetStateAction<number>>} config.setMaxItemsLimit
 */
export const AppSettings = ({
  isPersistent,
  setIsPersistent,
  maxItemsLimit,
  setMaxItemsLimit,
  isLoading,
}) => {
  /** @type {UseStateTemplate<boolean>} */
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(
    localStorage.getItem('app_autoRefreshEnabled') === 'true',
  );

  const [inAppProfileViewer, setInAppProfileViewer] = useState(
    localStorage.getItem('app_inAppProfileViewer') === 'true',
  );

  const [inAppViewer, setInAppViewer] = useState(
    localStorage.getItem('app_inAppViewer') === 'true',
  );

  /* Player Settings */
  const [plyrAutoplay, setPlyrAutoplay] = useState(
    localStorage.getItem('app_plyrAutoplay') !== 'false',
  );

  /** @type {UseStateTemplate<boolean>} */
  const [recVideoMode, setRecVideoMode] = useState(() => {
    return localStorage.getItem('app_recVideoMode') === 'true';
  });

  const [plyrMuted, setPlyrMuted] = useState(localStorage.getItem('app_plyrMuted') !== 'false');
  const [plyrLoop, setPlyrLoop] = useState(localStorage.getItem('app_plyrLoop') !== 'false');
  const [plyrHideControls, setPlyrHideControls] = useState(
    localStorage.getItem('app_plyrHideControls') !== 'false',
  );
  const [plyrStorage, setPlyrStorage] = useState(
    localStorage.getItem('app_plyrStorage') === 'true',
  );

  /** @type {UseStateTemplate<boolean>} */
  const [localFavesEnabled, setLocalFavesEnabled] = useState(false);

  /** @type {Ref<HTMLInputElement | null>} */
  const fileInputRef = useRef(null);

  /** @type {UseStateTemplate<boolean>} */
  const [isProcessingFaves, setIsProcessingFaves] = useState(false);

  useEffect(() => {
    /**
     * @returns {Promise<void>}
     */
    const initLocalFavesSetting = async () => {
      /** @type {string | null} */
      const storedVal = localStorage.getItem('app_localFavesEnabled');

      if (storedVal !== null) {
        setLocalFavesEnabled(storedVal === 'true');
      } else {
        /** @type {any[]} */
        const accounts = await getActiveAccounts();
        /** @type {boolean} */
        const onlyAnonymous =
          accounts.length > 0 && accounts.every((acc) => !acc.apiKey || acc.apiKey.trim() === '');

        setLocalFavesEnabled(onlyAnonymous);
        localStorage.setItem('app_localFavesEnabled', onlyAnonymous.toString());
      }
    };

    initLocalFavesSetting();
  }, []);

  /**
   * @param {import('react').ChangeEvent<HTMLInputElement>} e
   */
  const handleToggleLocalFaves = (e) => {
    /** @type {boolean} */
    const isChecked = e.target.checked;
    setLocalFavesEnabled(isChecked);
    localStorage.setItem('app_localFavesEnabled', isChecked.toString());
  };

  const handleToggleAutoRefresh = (e) => {
    const isChecked = e.target.checked;
    setAutoRefreshEnabled(isChecked);
    localStorage.setItem('app_autoRefreshEnabled', isChecked ? 'true' : 'false');
  };

  /**
   * @param {string} key
   * @param {Dispatch<SetStateAction<boolean>>} setter
   * @param {boolean} value
   */
  const handlePlyrSettingChange = (key, setter, value) => {
    setter(value);
    localStorage.setItem(key, value ? 'true' : 'false');
  };

  /**
   * @param {import('react').ChangeEvent<HTMLInputElement>} event
   */
  const handleSettingsChange = async (event) => {
    /** @type {boolean} */
    const isChecked = event.target.checked;
    setIsPersistent(isChecked);

    if (isChecked && navigator.storage && navigator.storage.persist) {
      /** @type {boolean} */
      const granted = await navigator.storage.persist();
      if (!granted) {
        alert('The browser denied persistent storage permission.');
        setIsPersistent(false);
        await updateSystemSettings(maxItemsLimit, 0);
        return;
      }
    }

    await updateSystemSettings(maxItemsLimit, isChecked ? 1 : 0);
  };

  /**
   * @param {import('react').ChangeEvent<HTMLInputElement>} event
   */
  const handleLimitChange = async (event) => {
    /** @type {number} */
    const val = parseInt(event.target.value, 10);
    setMaxItemsLimit(val);
    await updateSystemSettings(val, isPersistent ? 1 : 0);
  };

  /**
   * It handles exporting the favorites list to a JSON file.
   */
  const handleExportLocalFaves = async () => {
    if (isProcessingFaves) return;
    setIsProcessingFaves(true);
    try {
      // Retrieves the favorites array directly from the API/Database.
      const faves = await exportLocalFaves();

      if (!faves || faves.length === 0) {
        alert('You have no Local Favorites to export.');
        setIsProcessingFaves(false);
        return;
      }

      const blob = new Blob([JSON.stringify(faves, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `philomena-local-faves-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('An error occurred while exporting Local Favorites.');
    } finally {
      setIsProcessingFaves(false);
    }
  };

  /**
   * It handles importing a favorites list from a JSON file.
   * @param {import('react').ChangeEvent<HTMLInputElement>} event
   */
  const handleImportLocalFaves = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessingFaves(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const json = JSON.parse(typeof e.target.result === 'string' ? e.target.result : '');

        if (!Array.isArray(json)) {
          alert('Invalid JSON format. Expected an array of favorite images.');
          return;
        }

        const successCount = await importLocalFaves(json);
        await alert(`Successfully imported ${successCount} Local Favorites!`);

        // Reload the page to update the application status.
        location.reload();
      } catch (err) {
        console.error(err);
        alert('Invalid JSON file format or error during import.');
      } finally {
        setIsProcessingFaves(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.readAsText(file);
  };

  /**
   * Resets the entire Local Favorites database.
   */
  const handleResetLocalFaves = async () => {
    if (isProcessingFaves) return;

    // Confirmation alert using confirm
    if (
      await confirm(
        'Are you SURE you want to delete ALL your Local Favorites? This action cannot be undone unless you have a backup!',
      )
    ) {
      setIsProcessingFaves(true);
      try {
        await clearLocalFaves();
        await alert('All Local Favorites have been successfully deleted.');
        // Reload the page to clear the UI.
        location.reload();
      } catch (err) {
        console.error(err);
        alert('Failed to reset Local Favorites.');
      } finally {
        setIsProcessingFaves(false);
      }
    }
  };

  useEffect(() => {
    localStorage.setItem('app_recVideoMode', recVideoMode.toString());
  }, [recVideoMode]);

  return (
    <div className="fade-in pt-3">
      <div className="card no-anim">
        <div className="card-header fw-bold">App & Storage Settings</div>
        <div className="card-body">
          <div className="mb-3">
            <label className="form-label">Maximum Cached Items</label>
            <input
              type="number"
              className="form-control"
              value={maxItemsLimit}
              onChange={handleLimitChange}
              disabled={isLoading || isPersistent}
              step="1000"
            />
            <small className="text-muted">Will be ignored if Persistent Storage is enabled.</small>
          </div>
          <div className="form-check form-switch mb-2">
            <input
              className="form-check-input"
              type="checkbox"
              role="switch"
              id="persistSwitch"
              checked={isPersistent}
              onChange={handleSettingsChange}
              disabled={isLoading}
            />
            <label className="form-check-label" htmlFor="persistSwitch">
              Enable Persistent Storage (Requires Browser Permission)
            </label>
          </div>
          <div
            className="form-check form-switch mt-3 pt-3 border-top"
            style={{ borderColor: 'var(--app-border)' }}
          >
            <input
              className="form-check-input"
              type="checkbox"
              role="switch"
              id="inAppViewerSwitch"
              checked={inAppViewer}
              onChange={(e) => {
                setInAppViewer(e.target.checked);
                localStorage.setItem('app_inAppViewer', String(e.target.checked));
              }}
              disabled={isLoading}
            />
            <label
              className="form-check-label fw-semibold text-primary"
              htmlFor="inAppViewerSwitch"
            >
              Enable In-App Image Viewer (Opens images within the app instead of new tabs)
            </label>
          </div>
          <div className="form-check form-switch mt-2">
            <input
              className="form-check-input"
              type="checkbox"
              role="switch"
              id="inAppProfileViewerSwitch"
              checked={inAppProfileViewer}
              onChange={(e) => {
                setInAppProfileViewer(e.target.checked);
                localStorage.setItem('app_inAppProfileViewer', String(e.target.checked));
              }}
              disabled={isLoading}
            />
            <label
              className="form-check-label fw-semibold text-primary"
              htmlFor="inAppProfileViewerSwitch"
            >
              Enable In-App Profile Viewer (Opens user profiles within the app)
            </label>
          </div>
          <div className="form-check form-switch my-3">
            <input
              className="form-check-input"
              type="checkbox"
              id="autoRefreshToggle"
              checked={autoRefreshEnabled}
              onChange={handleToggleAutoRefresh}
            />
            <label className="form-check-label fw-bold" htmlFor="autoRefreshToggle">
              Enable Auto-Refresh on Inactivity
            </label>
            <div className="form-text text-muted small">
              If enabled, the app will automatically fetch new images when you return to the tab
              after 60 seconds of inactivity.
            </div>
          </div>
          <div className="form-check form-switch mb-4">
            <input
              type="checkbox"
              className="form-check-input"
              id="videoModeCheck"
              checked={recVideoMode}
              onChange={(e) => setRecVideoMode(e.target.checked)}
            />
            <label
              className="form-check-label fw-bold"
              htmlFor="videoModeCheck"
              style={{ color: 'var(--app-text)' }}
            >
              Video Mode (Beta)
            </label>
            <div className="form-text" style={{ color: 'var(--app-text)' }}>
              Appends the "video" tag to force video recommendations (Requires a page restart).
            </div>
          </div>
        </div>
      </div>

      <div className="card no-anim mt-4">
        <div className="card-header fw-bold">Video Player Settings</div>
        <div className="card-body">
          <div className="form-check form-switch mb-2">
            <input
              className="form-check-input"
              type="checkbox"
              role="switch"
              id="plyrAutoplaySwitch"
              checked={plyrAutoplay}
              onChange={(e) =>
                handlePlyrSettingChange('app_plyrAutoplay', setPlyrAutoplay, e.target.checked)
              }
            />
            <label className="form-check-label fw-semibold" htmlFor="plyrAutoplaySwitch">
              Autoplay videos
            </label>
          </div>
          <div className="form-check form-switch mb-2">
            <input
              className="form-check-input"
              type="checkbox"
              role="switch"
              id="plyrMutedSwitch"
              checked={plyrMuted}
              onChange={(e) =>
                handlePlyrSettingChange('app_plyrMuted', setPlyrMuted, e.target.checked)
              }
            />
            <label className="form-check-label fw-semibold" htmlFor="plyrMutedSwitch">
              Start muted
            </label>
          </div>
          <div className="form-check form-switch mb-2">
            <input
              className="form-check-input"
              type="checkbox"
              role="switch"
              id="plyrLoopSwitch"
              checked={plyrLoop}
              onChange={(e) =>
                handlePlyrSettingChange('app_plyrLoop', setPlyrLoop, e.target.checked)
              }
            />
            <label className="form-check-label fw-semibold" htmlFor="plyrLoopSwitch">
              Loop videos
            </label>
          </div>
          <div className="form-check form-switch mb-2">
            <input
              className="form-check-input"
              type="checkbox"
              role="switch"
              id="plyrHideControlsSwitch"
              checked={plyrHideControls}
              onChange={(e) =>
                handlePlyrSettingChange(
                  'app_plyrHideControls',
                  setPlyrHideControls,
                  e.target.checked,
                )
              }
            />
            <label className="form-check-label fw-semibold" htmlFor="plyrHideControlsSwitch">
              Hide controls automatically
            </label>
          </div>
          <div
            className="form-check form-switch mt-3 pt-3 border-top"
            style={{ borderColor: 'var(--app-border)' }}
          >
            <input
              className="form-check-input"
              type="checkbox"
              role="switch"
              id="plyrStorageSwitch"
              checked={plyrStorage}
              onChange={(e) =>
                handlePlyrSettingChange('app_plyrStorage', setPlyrStorage, e.target.checked)
              }
            />
            <label
              className="form-check-label fw-semibold text-primary"
              htmlFor="plyrStorageSwitch"
            >
              Enable Player Local Storage (Remembers volume and player settings)
            </label>
          </div>
        </div>
      </div>

      <div className="card no-anim mt-4">
        <div className="card-header fw-bold">Local Favorites Management</div>
        <div className="card-body">
          <div className={`form-check form-switch${localFavesEnabled ? ' mb-4' : ''}`}>
            <input
              className="form-check-input"
              type="checkbox"
              id="localFavesToggle"
              checked={localFavesEnabled}
              onChange={handleToggleLocalFaves}
            />
            <label className="form-check-label fw-bold text-info" htmlFor="localFavesToggle">
              Enable Local Favorites
            </label>
            <div className="form-text text-muted small">
              Allows you to fav images directly to your browser's local storage. Great for anonymous
              accounts!
            </div>
          </div>

          {localFavesEnabled && (
            <div
              className="d-flex flex-column gap-3 border-top pt-3"
              style={{ borderColor: 'var(--app-border)' }}
            >
              <div className="d-flex align-items-center flex-wrap gap-2">
                <input
                  type="file"
                  accept=".json"
                  style={{ display: 'none' }}
                  ref={fileInputRef}
                  onChange={handleImportLocalFaves}
                  disabled={isProcessingFaves}
                />

                <button
                  className="btn btn-sm btn-primary fw-bold"
                  onClick={handleExportLocalFaves}
                  disabled={isProcessingFaves}
                >
                  <i className="fa-solid fa-file-export me-2"></i>Export JSON
                </button>

                <button
                  className="btn btn-sm btn-outline-primary fw-bold"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessingFaves}
                >
                  <i className="fa-solid fa-file-import me-2"></i>Import JSON
                </button>

                <div className="ms-auto">
                  <button
                    className="btn btn-sm btn-danger fw-bold"
                    onClick={handleResetLocalFaves}
                    disabled={isProcessingFaves}
                  >
                    <i className="fa-solid fa-trash me-2"></i>Reset All
                  </button>
                </div>
              </div>

              {isProcessingFaves && (
                <div className="text-center text-primary mt-2">
                  <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                  <span className="fw-bold small">Processing... Please wait.</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
