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
  }

  /**
   * Reports the current status of this tab to the Service Worker.
   * @param {boolean} isUnregistering - If true, tells the SW this tab is closing.
   * @returns {Promise<void>}
   */
  async #reportStatus(isUnregistering = false) {
    await this.#sw.waitForReady();
    if (isUnregistering) {
      return this.#sw.emitApi('tab:unregister');
    }

    return this.#sw.emitApi('tab:register', {
      url: window.location.href,
      title: document.title,
    });
  }

  /**
   * Initializes a new instance of the TinySwTabsLayer, assigning it a unique key and registering it in the static instances registry.
   * @param {TinyServiceWorker} sw - The TinyServiceWorker instance.
   * @param {Partial<DebuggerConstructor>} [lgConfig] - Configuration options for the instance.
   */
  constructor(sw, lgConfig = {}) {
    super({
      logCfg: {
        id: '[_blue_TinySW-Tabs_reset_]',
        logger: lgConfig.logger ?? console,
        debugMode: lgConfig.debugMode ?? false,
        useLogColors: lgConfig.useLogColors ?? false,
      },
    });
    this.#sw = sw;
    this.#initListeners();
    this.#sw.waitForReady().then(() => this.register());
  }
  /**
   * Registers this tab in the manager.
   * @returns {Promise<void>}
   */
  async register() {
    this.#reportStatus();
  }

  /**
   * Explicitly requests the current list of all open tabs.
   * @returns {Promise<TabList>}
   */
  async getTabList() {
    return this.#sw.emitApi('tab:get_list');
  }

  /**
   * Retrieves the information for a specific tab by its unique ID.
   * @param {string} id - The unique identifier of the tab.
   * @returns {Promise<TabInfo|null>} - The tab information if found, or null if the tab does not exist.
   * @throws {TypeError} If the provided id is not a string.
   */
  async getTab(id) {
    if (typeof id !== 'string')
      throw new TypeError('[TinySwTabsLayer] getTab: id must be a string.');
    return (await this.#sw.emitApi('tab:get_tab', { id })) ?? null;
  }

  /**
   * Sets a callback to be executed whenever the tab list changes.
   * @param {(list: TabList) => void} callback
   */
  onUpdate(callback) {
    this.#sw.on('tab:list_updated', callback);
  }

  /**
   * Removes a callback from tab list change events.
   * @param {(list: TabList) => void} callback
   */
  offUpdate(callback) {
    this.#sw.off('tab:list_updated', callback);
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
  instance.allowedGets = ['onUpdate', 'offUpdate', 'getTabList', 'getTab', 'register'];
  if (!(engine instanceof TinyServiceWorker))
    throw new TypeError('Plugin requires a TinyServiceWorker instance to function.');
  return new TinySwTabsLayer(engine, lgConfig);
};

export default TinyTabManagerPlugin;
