import { TinyPluginLayer } from 'tiny-essentials/libs/plugin/TinyPlugin';
import TinyServiceWorker from 'tiny-essentials/libs/router/TinyServiceWorker';

/** @typedef {import('tiny-essentials/libs/tools/TinyDebugger').DebuggerConstructor} DebuggerConstructor - The constructor function for a debugger instance. */

/**
 * @typedef {Object} TabInfo
 * @property {string} id - The unique Client ID.
 * @property {string} url - The current URL.
 * @property {string} title - The document title.
 */

/**
 * @typedef {Object} TabList
 * @property {number} count - Total number of open tabs.
 * @property {TabInfo[]} tabs - Array of tab information.
 */

/**
 * Controller to be used in the main thread to communicate with the TabManagerPlugin.
 */
class TinySwTabsLayer extends TinyPluginLayer {
  /** @type {TinyServiceWorker} */
  #sw;

  /**
   * Initializes event listeners to detect navigation and visibility changes.
   */
  #initListeners() {
    // Detect URL/Title changes (Navigation)
    window.addEventListener('popstate', () => this.#reportStatus());
    window.addEventListener('visibilitychange', () => this.#reportStatus());

    // Detect Tab Closing (Most reliable event for closing/navigating away)
    window.addEventListener('pagehide', () => this.#reportStatus(true));

    // Listen for updates from the Service Worker
    this.#sw.on('tab:list_updated', (event) => {
      // This is handled via the TinyServiceWorker message system
    });
  }

  /**
   * Reports the current status of this tab to the Service Worker.
   * @param {boolean} isUnregistering - If true, tells the SW this tab is closing.
   */
  async #reportStatus(isUnregistering = false) {
    if (isUnregistering) {
      this.#sw.postMessage({ type: 'tab:unregister' });
      return;
    }

    this.#sw.postMessage({
      type: 'tab:register', // Using register as an 'update'/'sync' mechanism
      data: {
        url: window.location.href,
        title: document.title,
      },
    });
  }

  /**
   * Initializes a new instance of the TinySwTabsLayer, assigning it a unique key and registering it in the static instances registry.
   * @param {TinyServiceWorker} sw - The TinyServiceWorker instance.
   * @param {Partial<DebuggerConstructor>} [lgConfig] - Configuration options for the instance.
   */
  constructor(sw, lgConfig = {}) {
    super({
      sandboxBlacklist: { get: ['getTab'] },
      logCfg: {
        id: '[_blue_TinySW-Tabs_reset_]',
        logger: lgConfig.logger ?? console,
        debugMode: lgConfig.debugMode ?? false,
        useLogColors: lgConfig.useLogColors ?? false,
      },
    });
    this.#sw = sw;
    this.#initListeners();
  }
  /**
   * Registers this tab in the manager.
   */
  async register() {
    this.#reportStatus();
  }

  /**
   * Explicitly requests the current list of all open tabs.
   * @returns {Promise<TabList>}
   */
  async getTabList() {
    return new Promise((resolve) => {
      this.#sw.on('tab:list_response', (msg) => {
        resolve(msg.data);
      });
      this.#sw.emit('tab:get_list');
    });
  }

  /**
   * Sets a callback to be executed whenever the tab list changes.
   * @param {(list: TabList) => void} callback
   */
  onUpdate(callback) {
    this.#sw.on('tab:list_updated', (msg) => {
      callback(msg.data);
    });
  }
}

/**
 * A plugin for TinyServiceWorker that manages a centralized registry of all open website tabs.
 * @type {import('tiny-essentials/libs/router/TinyServiceWorker').SwPluginInstaller<TinySwTabsLayer, 'TabManager', '1.0.0', [Partial<DebuggerConstructor>]|[]>}
 */
const TinyTabManagerPlugin = (instance, lgConfig = {}) => {
  const engine = instance.engine;
  instance.id = 'TabManager';
  instance.version = '1.0.0';
  instance.description = 'Advanced tab manager.';
  instance.authors = ['JasminDreasond'];
  instance.contributors = ['JasminDreasond'];
  instance.categories = ['tab-manager'];
  instance.tags = ['management'];

  if (!(engine instanceof TinyServiceWorker)) {
    throw new TypeError('Plugin requires a TinyServiceWorker instance to function.');
  }

  const layer = new TinySwTabsLayer(engine, lgConfig);

  return layer;
};

export default TinyTabManagerPlugin;
