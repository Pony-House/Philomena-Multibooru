import { TinyPluginLayer } from 'tiny-essentials/libs/plugin/TinyPlugin';
import TinyServiceWorker from 'tiny-essentials/libs/router/TinyServiceWorker';

/** @typedef {import('tiny-essentials/libs/tools/TinyDebugger').DebuggerConstructor} DebuggerConstructor - The constructor function for a debugger instance. */

/**
 * Options of the new instance.
 * @typedef {Object} ConstructorOptions - Configuration options.
 * @property {boolean} [trackFocus=true] - Whether to track tab focus status.
 * @property {boolean} [allowTabClosing=true] - Whether the tab allows the SW to request tab closure.
 * @property {Partial<DebuggerConstructor>} [lgConfig] - Debugger configuration.
 */

/**
 * @typedef {Object} TabFocusPayload
 * @property {boolean} isFocused - Whether the tab is currently active and focused.
 */

/**
 * @typedef {Object} TabInfo
 * @property {string} id - The unique Client ID.
 * @property {string} url - The current URL.
 * @property {string} title - The document title.
 * @property {boolean} isFocused - Whether the tab currently has window focus.
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
  /** @type {TinyServiceWorker} - The TinyServiceWorker instance used for communication. */
  #sw;
  /** @type {boolean} - Indicates whether tab focus tracking is enabled. */
  #trackFocus;
  /** @type {boolean} - Indicates whether the tab allows closure requests from the SW. */
  #allowTabClosing;

  /**
   * Gets the current status of the focus tracking configuration.
   * @returns {boolean} - Whether the tab focus tracking is enabled.
   */
  get trackFocus() {
    return this.#trackFocus;
  }

  /**
   * Gets whether the tab allows closure requests from the Service Worker.
   * @returns {boolean}
   */
  get allowTabClosing() {
    return this.#allowTabClosing;
  }

  /**
   * Determines if the tab is truly active (visible and focused).
   * @returns {boolean}
   */
  #getIsTabActive() {
    const isHidden =
      'hidden' in document
        ? document.hidden
        : 'mozHidden' in document
          ? // @ts-ignore
            document.mozHidden
          : 'webkitHidden' in document
            ? // @ts-ignore
              document.webkitHidden
            : false;

    return !isHidden && document.hasFocus();
  }

  /**
   * Initializes event listeners to detect navigation, visibility, and focus changes.
   */
  #initListeners() {
    // Detect URL/Title changes (Navigation)
    window.addEventListener('popstate', () => this.#reportStatus());

    // Detect Tab Closing (Most reliable event for closing/navigating away)
    window.addEventListener('pagehide', () => this.#reportStatus(true));

    // Focus and Visibility Tracking
    if (this.#trackFocus) {
      const visibilityEvents = ['visibilitychange', 'focus', 'blur', 'pageshow', 'pagehide'];
      visibilityEvents.forEach((event) => {
        window.addEventListener(event, () => this.#reportStatus(false));
      });
    }
  }

  /**
   * Reports the current status and permissions of this tab to the Service Worker.
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
      isFocused: this.#trackFocus ? this.#getIsTabActive() : false,
      permissions: {
        allowFocusTracking: this.#trackFocus,
        allowTabClosing: this.#allowTabClosing,
      },
    });
  }

  /**
   * Updates the tab's permissions and synchronizes with the Service Worker.
   * @param {Object} config - The new permission configuration.
   * @param {boolean} [config.trackFocus] - New focus tracking permission.
   * @param {boolean} [config.allowTabClosing] - New tab closing permission.
   * @returns {Promise<void>}
   */
  async setPermissions({ trackFocus, allowTabClosing } = {}) {
    if (trackFocus !== undefined) this.#trackFocus = trackFocus;
    if (allowTabClosing !== undefined) this.#allowTabClosing = allowTabClosing;
    return this.#reportStatus();
  }

  /**
   * Initializes a new instance of the TinySwTabsLayer.
   * @param {TinyServiceWorker} sw - The TinyServiceWorker instance.
   * @param {ConstructorOptions} [options] - Configuration options.
   * @throws {TypeError} If the provided sw is not an instance of TinyServiceWorker.
   */
  constructor(sw, { lgConfig = {}, trackFocus = true, allowTabClosing = true } = {}) {
    super({
      logCfg: {
        id: '[_blue_TinySW-Tabs_reset_]',
        logger: lgConfig.logger ?? console,
        debugMode: lgConfig.debugMode ?? false,
        useLogColors: lgConfig.useLogColors ?? false,
      },
    });

    if (!(sw instanceof TinyServiceWorker)) {
      throw new TypeError(
        '[TinySwTabsLayer] Constructor: sw must be an instance of TinyServiceWorker.',
      );
    }

    this.#sw = sw;
    this.#trackFocus = trackFocus;
    this.#allowTabClosing = allowTabClosing;

    sw.onApi('tab:close', async () => {
      if (!this.#allowTabClosing) {
        return { authorized: false };
      }
      window.close();
      return { authorized: true };
    });

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
   * Closes a specific tab by its ID.
   * @param {string} id - The ID of the tab to close.
   * @returns {Promise<{ closed: boolean }>}
   */
  closeTab(id) {
    if (typeof id !== 'string')
      throw new TypeError('[TinySwTabsLayer] closeTab: id must be a string.');
    return this.#sw.emitApi('tab:close_single', { id });
  }

  /**
   * Closes multiple tabs by their IDs.
   * @param {string[]} ids - Array of tab IDs.
   * @returns {Promise<{ closed: (-1|0|1)[] }>} (-1: no permission | 0: no closed | 1: closed)
   */
  closeTabs(ids) {
    if (!Array.isArray(ids))
      throw new TypeError('[TinySwTabsLayer] closeTabs: ids must be an array.');
    return this.#sw.emitApi('tab:close_multiple', { ids });
  }

  /**
   * Closes all registered tabs.
   * @returns {Promise<void>}
   */
  closeAllTabs() {
    return this.#sw.emitApi('tab:close_all');
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
 * @type {import('tiny-essentials/libs/router/TinyServiceWorker').SwPluginInstaller<TinySwTabsLayer, 'TabManager', '1.0.0', [ConstructorOptions]|[]>}
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
  instance.allowedGets = [
    'onUpdate',
    'offUpdate',
    'getTabList',
    'getTab',
    'register',
    'closeTab',
    'closeTabs',
    'closeAllTabs',
    'trackFocus',
  ];

  if (!(engine instanceof TinyServiceWorker))
    throw new TypeError('Plugin requires a TinyServiceWorker instance to function.');
  return new TinySwTabsLayer(engine, lgConfig);
};

export default TinyTabManagerPlugin;
