import { useRef, useState } from 'react';
import { alert } from 'tiny-essentials/webTemplates/bootstrap/5.3/html/BootstrapDialogs';

/**
 * @param {Object} config
 * @param {boolean} config.isDark
 */
export const ThemeSettings = ({ isDark }) => {
  /** @type {Ref<HTMLInputElement | null>} */
  const fileInputRef = useRef(null);

  /** @type {UseStateTemplate<string>} */
  const [themeMode, setThemeMode] = useState(localStorage.getItem('app_themeMode') || 'system');

  /* Global Colors */
  const [customPrimary, setCustomPrimary] = useState(localStorage.getItem('app_primary') || '');
  const [customBg, setCustomBg] = useState(localStorage.getItem('app_bg') || '');
  const [customNavbar, setCustomNavbar] = useState(localStorage.getItem('app_navbar') || '');
  const [customDanger, setCustomDanger] = useState(localStorage.getItem('app_danger') || '');

  /* Textos, Inputs, Spinners and Badges */
  const [customText, setCustomText] = useState(localStorage.getItem('app_text') || '');
  const [customTextMuted, setCustomTextMuted] = useState(
    localStorage.getItem('app_text_muted') || '',
  );
  const [customInputBg, setCustomInputBg] = useState(localStorage.getItem('app_input_bg') || '');
  const [customInputText, setCustomInputText] = useState(
    localStorage.getItem('app_input_text') || '',
  );
  const [customBadgeBg, setCustomBadgeBg] = useState(localStorage.getItem('app_badge_bg') || '');
  const [customBadgeText, setCustomBadgeText] = useState(
    localStorage.getItem('app_badge_text') || '',
  );
  const [customSpinner, setCustomSpinner] = useState(localStorage.getItem('app_spinner') || '');

  /* Alerts */
  const [alertWarningBg, setAlertWarningBg] = useState(
    localStorage.getItem('alert_warning_bg') || '',
  );
  const [alertWarningText, setAlertWarningText] = useState(
    localStorage.getItem('alert_warning_text') || '',
  );
  const [alertInfoBg, setAlertInfoBg] = useState(localStorage.getItem('alert_info_bg') || '');
  const [alertInfoText, setAlertInfoText] = useState(localStorage.getItem('alert_info_text') || '');
  const [alertDangerBg, setAlertDangerBg] = useState(localStorage.getItem('alert_danger_bg') || '');
  const [alertDangerText, setAlertDangerText] = useState(
    localStorage.getItem('alert_danger_text') || '',
  );

  /* Interactions */
  const [customFave, setCustomFave] = useState(localStorage.getItem('app_fave') || '');
  const [customLocalFave, setCustomLocalFave] = useState(
    localStorage.getItem('app_local_fave') || '',
  );
  const [customUpvote, setCustomUpvote] = useState(localStorage.getItem('app_upvote') || '');
  const [customDownvote, setCustomDownvote] = useState(localStorage.getItem('app_downvote') || '');

  /**
   * @param {string} mode
   */
  const handleThemeModeChange = (mode) => {
    setThemeMode(mode);
    localStorage.setItem('app_themeMode', mode);
    window.dispatchEvent(new Event('themeChanged'));
  };

  /**
   * @param {string} key
   * @param {string} value
   * @param {Dispatch<SetStateAction<string>>} setter
   */
  const handleColorChange = (key, value, setter) => {
    localStorage.setItem(key, value);
    setter(value);
    window.dispatchEvent(new Event('themeChanged'));
  };

  const resetColors = () => {
    const keysToReset = [
      'app_primary',
      'app_bg',
      'app_navbar',
      'app_danger',
      'app_text',
      'app_text_muted',
      'app_input_bg',
      'app_input_text',
      'app_badge_bg',
      'app_badge_text',
      'app_spinner',
      'alert_warning_bg',
      'alert_warning_text',
      'alert_info_bg',
      'alert_info_text',
      'alert_danger_bg',
      'alert_danger_text',
      'app_fave',
      'app_local_fave',
      'app_upvote',
      'app_downvote',
    ];

    keysToReset.forEach((key) => localStorage.removeItem(key));

    setCustomPrimary('');
    setCustomBg('');
    setCustomNavbar('');
    setCustomDanger('');
    setCustomText('');
    setCustomTextMuted('');
    setCustomInputBg('');
    setCustomInputText('');
    setCustomBadgeBg('');
    setCustomBadgeText('');
    setCustomSpinner('');
    setAlertWarningBg('');
    setAlertWarningText('');
    setAlertInfoBg('');
    setAlertInfoText('');
    setAlertDangerBg('');
    setAlertDangerText('');
    setCustomFave('');
    setCustomLocalFave('');
    setCustomUpvote('');
    setCustomDownvote('');

    window.dispatchEvent(new Event('themeChanged'));
  };

  /**
   * @returns {void}
   */
  const handleExportTheme = () => {
    const keys = [
      'app_primary',
      'app_bg',
      'app_navbar',
      'app_danger',
      'app_text',
      'app_text_muted',
      'app_input_bg',
      'app_input_text',
      'app_badge_bg',
      'app_badge_text',
      'app_spinner',
      'alert_warning_bg',
      'alert_warning_text',
      'alert_info_bg',
      'alert_info_text',
      'alert_danger_bg',
      'alert_danger_text',
      'app_fave',
      'app_local_fave',
      'app_upvote',
      'app_downvote',
    ];

    const themeData = {};
    keys.forEach((k) => {
      const val = localStorage.getItem(k);
      if (val) themeData[k] = val;
    });

    const blob = new Blob([JSON.stringify(themeData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'philomena-theme.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  /**
   * @param {import('react').ChangeEvent<HTMLInputElement>} event
   * @returns {void}
   */
  const handleImportTheme = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const json = JSON.parse(typeof e.target?.result === 'string' ? e.target.result : '');
        const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        const validKeys = [
          'app_primary',
          'app_bg',
          'app_navbar',
          'app_danger',
          'app_text',
          'app_text_muted',
          'app_input_bg',
          'app_input_text',
          'app_badge_bg',
          'app_badge_text',
          'app_spinner',
          'alert_warning_bg',
          'alert_warning_text',
          'alert_info_bg',
          'alert_info_text',
          'alert_danger_bg',
          'alert_danger_text',
          'app_fave',
          'app_local_fave',
          'app_upvote',
          'app_downvote',
        ];

        let importedCount = 0;
        for (const key of Object.keys(json)) {
          if (
            validKeys.includes(key) &&
            typeof json[key] === 'string' &&
            hexRegex.test(json[key])
          ) {
            localStorage.setItem(key, json[key]);
            importedCount++;
          }
        }

        if (importedCount > 0) {
          await alert('Theme imported successfully! Reloading to apply all colors.');
          location.reload();
        } else {
          alert('No valid colors found in the file.');
        }
      } catch (err) {
        console.error(err);
        alert('Invalid JSON file format.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  return (
    <div className="fade-in pt-3">
      <div className="card no-anim">
        <div
          className="card-header fw-bold d-flex justify-content-between align-items-center"
          style={{ backgroundColor: 'var(--app-primary)', color: '#ffffff' }}
        >
          <span>Theme & Colors Editor (Beta)</span>
          <div>
            <input
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              ref={fileInputRef}
              onChange={handleImportTheme}
            />
            <button
              className={`btn btn-sm btn-outline-${isDark ? 'light' : 'dark'} me-2`}
              onClick={() => fileInputRef.current?.click()}
            >
              Import Theme
            </button>
            <button
              className={`btn btn-sm btn-outline-${isDark ? 'light' : 'dark'}`}
              onClick={handleExportTheme}
            >
              Export Theme
            </button>
          </div>
        </div>
        <div className="card-body">
          <div className="mb-4">
            <label className="form-label fw-semibold">Appearance Mode</label>
            <select
              className="form-select bg-transparent"
              style={{ borderColor: 'var(--app-border)', color: 'var(--app-text)' }}
              value={themeMode}
              onChange={(e) => handleThemeModeChange(e.target.value)}
            >
              <option value="system" style={{ color: '#000' }}>
                System Default
              </option>
              <option value="light" style={{ color: '#000' }}>
                Light Mode
              </option>
              <option value="dark" style={{ color: '#000' }}>
                Dark Mode
              </option>
            </select>
          </div>

          <h6 className="fw-bold mb-3 mt-4 border-bottom pb-2">Global Colors</h6>
          <div className="row mb-3">
            <div className="col-md-3 mb-2">
              <label className="form-label small fw-semibold">Primary Color</label>
              <input
                type="color"
                className="form-control form-control-color w-100"
                value={customPrimary || '#4f46e5'}
                onChange={(e) => handleColorChange('app_primary', e.target.value, setCustomPrimary)}
              />
            </div>
            <div className="col-md-3 mb-2">
              <label className="form-label small fw-semibold">Danger Color</label>
              <input
                type="color"
                className="form-control form-control-color w-100"
                value={customDanger || '#ef4444'}
                onChange={(e) => handleColorChange('app_danger', e.target.value, setCustomDanger)}
              />
            </div>
            <div className="col-md-3 mb-2">
              <label className="form-label small fw-semibold">App Background</label>
              <input
                type="color"
                className="form-control form-control-color w-100"
                value={customBg || '#f8fafc'}
                onChange={(e) => handleColorChange('app_bg', e.target.value, setCustomBg)}
              />
            </div>
            <div className="col-md-3 mb-2">
              <label className="form-label small fw-semibold">Navbar Background</label>
              <input
                type="color"
                className="form-control form-control-color w-100"
                value={customNavbar || '#0f172a'}
                onChange={(e) => handleColorChange('app_navbar', e.target.value, setCustomNavbar)}
              />
            </div>
          </div>

          <h6 className="fw-bold mb-3 mt-4 border-bottom pb-2">Inputs, Badges & Loaders</h6>
          <div className="row mb-3">
            <div className="col-md-2 col-6 mb-2">
              <label className="form-label small fw-semibold">Input BG</label>
              <input
                type="color"
                className="form-control form-control-color w-100"
                value={customInputBg || '#ffffff'}
                onChange={(e) =>
                  handleColorChange('app_input_bg', e.target.value, setCustomInputBg)
                }
              />
            </div>
            <div className="col-md-2 col-6 mb-2">
              <label className="form-label small fw-semibold">Input Text</label>
              <input
                type="color"
                className="form-control form-control-color w-100"
                value={customInputText || '#334155'}
                onChange={(e) =>
                  handleColorChange('app_input_text', e.target.value, setCustomInputText)
                }
              />
            </div>
            <div className="col-md-2 col-6 mb-2">
              <label className="form-label small fw-semibold">Badge BG</label>
              <input
                type="color"
                className="form-control form-control-color w-100"
                value={customBadgeBg || '#10b981'}
                onChange={(e) =>
                  handleColorChange('app_badge_bg', e.target.value, setCustomBadgeBg)
                }
              />
            </div>
            <div className="col-md-2 col-6 mb-2">
              <label className="form-label small fw-semibold">Badge Text</label>
              <input
                type="color"
                className="form-control form-control-color w-100"
                value={customBadgeText || '#ffffff'}
                onChange={(e) =>
                  handleColorChange('app_badge_text', e.target.value, setCustomBadgeText)
                }
              />
            </div>
            <div className="col-md-4 col-12 mb-2">
              <label className="form-label small fw-semibold text-primary">Spinner Loader</label>
              <input
                type="color"
                className="form-control form-control-color w-100"
                value={customSpinner || '#4f46e5'}
                onChange={(e) => handleColorChange('app_spinner', e.target.value, setCustomSpinner)}
              />
            </div>
          </div>

          <h6 className="fw-bold mb-3 mt-4 border-bottom pb-2">Text Colors</h6>
          <div className="row mb-3">
            <div className="col-md-6 mb-2">
              <label className="form-label small fw-semibold">Main Text</label>
              <input
                type="color"
                className="form-control form-control-color w-100"
                value={customText || '#334155'}
                onChange={(e) => handleColorChange('app_text', e.target.value, setCustomText)}
              />
            </div>
            <div className="col-md-6 mb-2">
              <label className="form-label small fw-semibold text-muted">Muted Text</label>
              <input
                type="color"
                className="form-control form-control-color w-100"
                value={customTextMuted || '#64748b'}
                onChange={(e) =>
                  handleColorChange('app_text_muted', e.target.value, setCustomTextMuted)
                }
              />
            </div>
          </div>

          <h6 className="fw-bold mb-3 mt-4 border-bottom pb-2">Alert Colors</h6>
          <div className="row mb-3">
            <div className="col-md-6 col-lg-3 mb-2">
              <label className="form-label small fw-semibold text-warning">Warning BG</label>
              <input
                type="color"
                className="form-control form-control-color w-100"
                value={alertWarningBg || '#fef3c7'}
                onChange={(e) =>
                  handleColorChange('alert_warning_bg', e.target.value, setAlertWarningBg)
                }
              />
            </div>
            <div className="col-md-6 col-lg-3 mb-2">
              <label className="form-label small fw-semibold text-warning">Warning Text</label>
              <input
                type="color"
                className="form-control form-control-color w-100"
                value={alertWarningText || '#92400e'}
                onChange={(e) =>
                  handleColorChange('alert_warning_text', e.target.value, setAlertWarningText)
                }
              />
            </div>
            <div className="col-md-6 col-lg-3 mb-2">
              <label className="form-label small fw-semibold text-info">Info BG</label>
              <input
                type="color"
                className="form-control form-control-color w-100"
                value={alertInfoBg || '#e0f2fe'}
                onChange={(e) => handleColorChange('alert_info_bg', e.target.value, setAlertInfoBg)}
              />
            </div>
            <div className="col-md-6 col-lg-3 mb-2">
              <label className="form-label small fw-semibold text-info">Info Text</label>
              <input
                type="color"
                className="form-control form-control-color w-100"
                value={alertInfoText || '#075985'}
                onChange={(e) =>
                  handleColorChange('alert_info_text', e.target.value, setAlertInfoText)
                }
              />
            </div>
            <div className="col-md-6 col-lg-3 mb-2">
              <label className="form-label small fw-semibold text-danger">Danger BG</label>
              <input
                type="color"
                className="form-control form-control-color w-100"
                value={alertDangerBg || '#fee2e2'}
                onChange={(e) =>
                  handleColorChange('alert_danger_bg', e.target.value, setAlertDangerBg)
                }
              />
            </div>
            <div className="col-md-6 col-lg-3 mb-2">
              <label className="form-label small fw-semibold text-danger">Danger Text</label>
              <input
                type="color"
                className="form-control form-control-color w-100"
                value={alertDangerText || '#991b1b'}
                onChange={(e) =>
                  handleColorChange('alert_danger_text', e.target.value, setAlertDangerText)
                }
              />
            </div>
          </div>

          <h6 className="fw-bold mb-3 mt-4 border-bottom pb-2">Interaction Symbols</h6>
          <div className="row mb-4">
            <div className="col-md-3 mb-2">
              <label className="form-label small fw-semibold text-warning">Favorite Symbol</label>
              <input
                type="color"
                className="form-control form-control-color w-100"
                value={customFave || '#f59e0b'}
                onChange={(e) => handleColorChange('app_fave', e.target.value, setCustomFave)}
              />
            </div>
            <div className="col-md-3 mb-2">
              <label className="form-label small fw-semibold text-info">Local Fave Symbol</label>
              <input
                type="color"
                className="form-control form-control-color w-100"
                value={customLocalFave || '#0dcaf0'}
                onChange={(e) =>
                  handleColorChange('app_local_fave', e.target.value, setCustomLocalFave)
                }
              />
            </div>
            <div className="col-md-3 mb-2">
              <label className="form-label small fw-semibold text-success">Upvote Symbol</label>
              <input
                type="color"
                className="form-control form-control-color w-100"
                value={customUpvote || '#10b981'}
                onChange={(e) => handleColorChange('app_upvote', e.target.value, setCustomUpvote)}
              />
            </div>
            <div className="col-md-3 mb-2">
              <label className="form-label small fw-semibold text-danger">Downvote Symbol</label>
              <input
                type="color"
                className="form-control form-control-color w-100"
                value={customDownvote || '#ef4444'}
                onChange={(e) =>
                  handleColorChange('app_downvote', e.target.value, setCustomDownvote)
                }
              />
            </div>
          </div>

          <button className="btn btn-outline-danger btn-sm" onClick={resetColors}>
            Reset All Colors to Default
          </button>
        </div>
      </div>
    </div>
  );
};
