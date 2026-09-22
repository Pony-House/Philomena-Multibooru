import { TinyPluginLayer } from 'tiny-essentials/libs/plugin/TinyPlugin';
import TinyServiceWorker from 'tiny-essentials/libs/router/TinyServiceWorker';

/** @typedef {import('tiny-essentials/libs/tools/TinyDebugger').DebuggerConstructor} DebuggerConstructor - The constructor function for a debugger instance. */

/**
 * @typedef {(() => any)} ExtraDataFn - A function that returns custom data.
 */

/**
 * Options of the new instance.
 * @typedef {Object} ConstructorOptions - Configuration options.
 * @property {boolean} [trackFocus=true] - Whether to track tab focus status.
 * @property {boolean} [allowTabClosing=true] - Whether the tab allows the SW to request tab closure.
 * @property {ExtraDataFn} [getExtraData] - Optional function that returns custom data to be cached in the SW.
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
 * @property {any} [data] - Custom data provided by the client.
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
  /** @type {ExtraDataFn|null} - The function used to retrieve custom data for the tab. */
  #extraDataFn;

  /**
   * Gets the current status of the focus tracking configuration.
   * @returns {boolean} - Whether the tab focus tracking is enabled.
   */
  get trackFocus() {
    return this.#trackFocus;
  }

  /**
   * Gets whether the tab allows closure requests from the Service Worker.
   * @returns {boolean} - Whether the tab allows closure requests.
   */
  get allowTabClosing() {
    return this.#allowTabClosing;
  }

  /**
   * Determines if the tab is truly active (visible and focused).
   * @returns {boolean} - True if the tab is visible and has focus.
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
   * @returns {Promise<void>} - A promise that resolves when the status report is complete.
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
      data: typeof this.#extraDataFn === 'function' ? await this.#extraDataFn() : undefined,
      permissions: {
        allowFocusTracking: this.#trackFocus,
        allowTabClosing: this.#allowTabClosing,
      },
    });
  }

  /**
   * Updates the tab's permissions and synchronizes with the Service Worker.
   * @param {Object} options - The new permission configuration.
   * @param {boolean} [options.trackFocus] - New focus tracking permission.
   * @param {boolean} [options.allowTabClosing] - New tab closing permission.
   * @returns {Promise<void>} - A promise that resolves when the status report is complete.
   * @throws {TypeError} If options is not an object or properties are not booleans.
   */
  async setPermissions(options = {}) {
    if (typeof options !== 'object' || options === null || Array.isArray(options)) {
      throw new TypeError('[TinySwTabsLayer] setPermissions: options must be an object.');
    }

    if (options.trackFocus !== undefined && typeof options.trackFocus !== 'boolean') {
      throw new TypeError('[TinySwTabsLayer] setPermissions: trackFocus must be a boolean.');
    }

    if (options.allowTabClosing !== undefined && typeof options.allowTabClosing !== 'boolean') {
      throw new TypeError('[TinySwTabsLayer] setPermissions: allowTabClosing must be a boolean.');
    }

    if (options.trackFocus !== undefined) this.#trackFocus = options.trackFocus;
    if (options.allowTabClosing !== undefined) this.#allowTabClosing = options.allowTabClosing;

    return this.#reportStatus();
  }

  /**
   * Initializes a new instance of the TinySwTabsLayer.
   * @param {TinyServiceWorker} sw - The TinyServiceWorker instance used for communication.
   * @param {ConstructorOptions} [options] - Configuration options.
   * @throws {TypeError} If sw is not an instance of TinyServiceWorker or options are invalid.
   */
  constructor(sw, options = {}) {
    super({
      logCfg: {
        id: '[_blue_TinySW-Tabs_reset_]',
        logger: options.lgConfig?.logger ?? console,
        debugMode: options.lgConfig?.debugMode ?? false,
        useLogColors: options.lgConfig?.useLogColors ?? false,
      },
    });

    if (!(sw instanceof TinyServiceWorker)) {
      throw new TypeError(
        '[TinySwTabsLayer] Constructor: sw must be an instance of TinyServiceWorker.',
      );
    }

    // Deep validation of ConstructorOptions
    if (typeof options !== 'object' || options === null || Array.isArray(options)) {
      throw new TypeError('[TinySwTabsLayer] Constructor: options must be an object.');
    }
    if (options.trackFocus !== undefined && typeof options.trackFocus !== 'boolean') {
      throw new TypeError('[TinySwTabsLayer] Constructor: trackFocus must be a boolean.');
    }
    if (options.allowTabClosing !== undefined && typeof options.allowTabClosing !== 'boolean') {
      throw new TypeError('[TinySwTabsLayer] Constructor: allowTabClosing must be a boolean.');
    }
    if (options.getExtraData !== undefined && typeof options.getExtraData !== 'function') {
      throw new TypeError('[TinySwTabsLayer] Constructor: getExtraData must be a function.');
    }

    this.#sw = sw;
    this.#trackFocus = options.trackFocus ?? true;
    this.#allowTabClosing = options.allowTabClosing ?? true;
    this.#extraDataFn = options.getExtraData ?? null;

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
   * @returns {Promise<void>} - A promise that resolves when the registration is complete.
   */
  async register() {
    this.#reportStatus();
  }

  /**
   * Explicitly requests the current list of all open tabs.
   * @returns {Promise<TabList>} - A promise that resolves with the current list of tabs.
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
   * @returns {Promise<{ closed: boolean }>} - A promise that resolves with the result of the close request.
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
   * @returns {Promise<void>} - A promise that resolves when all tabs have been requested to close.
   */
  closeAllTabs() {
    return this.#sw.emitApi('tab:close_all');
  }

  /**
   * Sets a callback to be executed whenever the tab list changes.
   * @param {(list: TabList) => void} callback - The function to execute when the tab list changes.
   */
  onUpdate(callback) {
    this.#sw.on('tab:list_updated', callback);
  }

  /**
   * Removes a callback from tab list change events.
   * @param {(list: TabList) => void} callback - The callback function to remove.
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
