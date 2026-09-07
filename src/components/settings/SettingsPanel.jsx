import { useState } from 'react';
import { getActiveAccounts } from '../../services/api/System.js';

import { Privacy } from './Privacy.jsx';
import { About } from './About.jsx';
import { ThemeSettings } from './Theme.jsx';
import { AppSettings } from './AppSettings.jsx';
import { FactoryReset } from './FactoryReset.jsx';
import { Filters } from './Filters.jsx';
import { Accounts } from './Accounts.jsx';
import { RecommendationsSettings } from './RecommendationsSettings.jsx';

/**
 * @template T
 * @typedef {import('react').SetStateAction<T>} SetStateAction
 */

/**
 * @template T
 * @typedef {import('react').Dispatch<T>} Dispatch
 */

/**
 * @typedef {import('../../services/api/System.js').Account} Account
 */

/**
 * @typedef {Object} FilterObj
 * @property {number} id
 * @property {string} name
 * @property {string} description
 */

/**
 * @param {{ isDark: boolean; onClose: () => void; }} props
 */
export const SettingsPanel = ({ isDark }) => {
  /** @type {ReactSetStateAction<boolean>} */
  const [isLoading, setIsLoading] = useState(true);

  /** @type {ReactSetStateAction<number>} */
  const [maxItemsLimit, setMaxItemsLimit] = useState(10000);

  /** @type {ReactSetStateAction<boolean>} */
  const [isPersistent, setIsPersistent] = useState(false);

  /* More Stuff */
  /** @type {ReactSetStateAction<string>} */
  const [activeTab, setActiveTab] = useState('accounts');

  /** @type {ReactSetStateAction<Account[]>} */
  const [accounts, setAccounts] = useState([]);

  /**
   * @returns {Promise<void>}
   */
  const loadAccounts = async () => {
    const accs = await getActiveAccounts();
    setAccounts(accs);
  };

  return (
    <div
      className="container mt-4 mb-4 p-4 rounded shadow-sm border"
      style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
    >
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold m-0" style={{ color: 'var(--app-text)' }}>
          Settings
        </h2>
      </div>

      <div
        className="border-0"
        style={{ backgroundColor: 'var(--app-surface)', color: 'var(--app-text)' }}
      >
        {/* MENU */}
        <div
          className="card-header border-bottom-0 pt-3 pb-0"
          style={{ backgroundColor: 'transparent' }}
        >
          <ul
            className="nav nav-tabs flex-wrap border-bottom"
            style={{ borderColor: 'var(--app-border)' }}
          >
            {[
              { name: 'Accounts', value: 'accounts' },
              { name: 'Filters', value: 'filters' },
              { name: 'Recommendations', value: 'recs' },
              { name: 'App & Storage', value: 'app' },
              { name: 'Theme', value: 'theme' },
              { name: 'About & FAQ', value: 'about' },
              { name: 'Privacy & Terms', value: 'privacy' },
            ].map((menu, key) => (
              <li key={key} className="nav-item">
                <button
                  className={`nav-link fw-bold ${activeTab === menu.value ? 'active bg-transparent' : 'text-muted border-transparent'}`}
                  style={{
                    color: activeTab === menu.value ? 'var(--app-primary)' : 'inherit',
                    borderBottomColor:
                      activeTab === menu.value ? 'var(--app-surface)' : 'transparent',
                  }}
                  onClick={() => setActiveTab(menu.value)}
                >
                  {menu.name}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* ACCOUNTS TAB */}
        {activeTab === 'accounts' && (
          <Accounts
            setActiveTab={setActiveTab}
            setIsPersistent={setIsPersistent}
            setMaxItemsLimit={setMaxItemsLimit}
            loadAccounts={loadAccounts}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
        )}

        {/* FILTERS TAB */}
        {activeTab === 'filters' && (
          <Filters loadAccounts={loadAccounts} accounts={accounts} activeTab={activeTab} />
        )}

        {/* RECOMMENDATIONS TAB */}
        {activeTab === 'recs' && <RecommendationsSettings />}

        {/* APP TAB */}
        {activeTab === 'app' && (
          <AppSettings
            isPersistent={isPersistent}
            setIsPersistent={setIsPersistent}
            maxItemsLimit={maxItemsLimit}
            setMaxItemsLimit={setMaxItemsLimit}
            isLoading={isLoading}
          />
        )}

        {/* Theme TAB */}
        {activeTab === 'theme' && <ThemeSettings isDark={isDark} />}

        {/* ABOUT & FAQ TAB */}
        {activeTab === 'about' && <About />}

        {/* PRIVACY & TERMS TAB */}
        {activeTab === 'privacy' && <Privacy />}

        <FactoryReset isLoading={isLoading} />
      </div>
    </div>
  );
};
