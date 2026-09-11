import { TinyPluginLayer } from '../TinyPlugin.mjs';
import TinyServiceWorkerEngine from '../TinyServiceWorkerEngine.mjs';

/**
 * Represents information about a single browser tab.
 * @typedef {Object} TabInfo
 * @property {string} id - The unique Client ID provided by the browser.
 * @property {string} url - The current URL of the tab.
 * @property {string} title - The document title of the tab.
 */

/**
 * A mapping of unique tab IDs to their corresponding TabInfo objects.
 * @typedef {Map<string, TabInfo>} TabInstance
 */

/**
 * A layer within the TinyPlugin system specifically designed to manage and track tab instances.
 */
class TinySwTabsLayer extends TinyPluginLayer {
  /**
   * A static registry that stores all active tab instances indexed by a unique key.
   * @type {Map<number, TabInstance>}
   */
  static #instances = new Map();
  /**
   * A static counter used to assign unique keys to new TinySwTabsLayer instances.
   * @type {number}
   */
  static #lastIndex = -1;

  /**
   * The unique identifier assigned to the current instance of the layer.
   * @type {number}
   */
  #key;
  /**
   * A private Map storing the current session's tab information.
   * @type {TabInstance}
   */
  #tabs = new Map();

  /**
   * Retrieves a snapshot of all tabs currently managed by the instance corresponding to the provided key.
   * @param {number} key
   * @returns {Record<string, TabInfo>|null}
   */
  static getTabsInstance(key) {
    const instance = TinySwTabsLayer.#instances.get(key);
    if (!instance) return null;

    /** @type {Record<string, TabInfo>} */
    const tabs = {};
    instance.forEach((tab, key) => {
      tabs[key] = { ...tab };
    });

    return tabs;
  }

  /**
   * Retrieves the information for a specific tab by its unique ID.
   * @param {string} id
   * @returns {TabInfo|null}
   * @throws {ReferenceError} If the internal layer instance cannot be found in the registry.
   */
  getTab(id) {
    const instance = TinySwTabsLayer.#instances.get(this.#key);
    if (!instance) {
      throw new ReferenceError('[TinySwTabsLayer] Instance not found for the current key.');
    }
    const tab = instance.get(id);
    if (!tab) return null;
    return { ...tab };
  }

  /**
   * Initializes the layer and begins monitoring tab changes via a callback.
   * @param {(tabs: TabInstance) => void} callback
   */
  _start(callback) {
    return this._startLayer(callback, this.#tabs);
  }

  /**
   * Initializes a new instance of the TinySwTabsLayer, assigning it a unique key and registering it in the static instances registry.
   * @param {Object} [lgConfig] - Configuration options for the instance.
   * @param {boolean} [lgConfig.debugMode=false] - Whether to enable internal debug logging.
   * @param {boolean} [lgConfig.useLogColors=false] - Whether to enable log color support.
   * @param {Partial<Console>} [lgConfig.logger=console] - A custom logger object.
   */
  constructor(lgConfig = {}) {
    super({
      sandboxBlacklist: { get: ['getTab'] },
      logCfg: {
        id: '[_blue_TinySW-Tabs_reset_]',
        logger: lgConfig.logger ?? console,
        debugMode: lgConfig.debugMode ?? false,
        useLogColors: lgConfig.useLogColors ?? false,
      },
    });

    TinySwTabsLayer.#lastIndex++;
    TinySwTabsLayer.#instances.set(TinySwTabsLayer.#lastIndex, this.#tabs);
    this.#key = TinySwTabsLayer.#lastIndex;
  }
}

/**
 * A plugin for TinyServiceWorkerEngine that manages a centralized registry of all open website tabs.
 * @type {import('../TinyServiceWorkerEngine.mjs').SwPluginInstaller<TinySwTabsLayer, 'TabManager', '1.0.0', []>}
 */
const TinyTabManagerPlugin = (instance) => {
  const engine = instance.engine;
  instance.id = 'TabManager';
  instance.version = '1.0.0';
  instance.description = 'Advanced tag manager.';
  instance.authors = ['JasminDreasond'];
  instance.contributors = ['JasminDreasond'];
  instance.categories = ['tab-manager'];
  instance.tags = ['management'];

  if (!(engine instanceof TinyServiceWorkerEngine)) {
    throw new TypeError('Plugin requires a TinyServiceWorkerEngine instance to function.');
  }

  const layer = new TinySwTabsLayer();
  layer._start((tabs) => {
    /**
     * Broadcasts the current list of tabs to all connected clients.
     * @returns {Promise<void>}
     */
    const broadcastUpdate = async () => {
      const tabList = {
        count: tabs.size,
        tabs: Array.from(tabs.values()),
      };

      // We use replyToAll to notify all clients that the list has changed.
      await TinyServiceWorkerEngine.replyToAll({
        type: 'tab:list_updated',
        data: tabList,
      });
    };

    // 1. Handle Tab Registration (When a new tab opens)
    engine.addMessageListener(
      'tab:register',
      /**
       * Processes registration messages to add new tabs to the registry.
       */ async (msg) => {
        const { data, clientId } = msg;

        if (typeof data?.url !== 'string' || typeof data?.title !== 'string') {
          throw new TypeError(
            '[TinyTabManagerPlugin] tab:register: data must contain url (string) and title (string).',
          );
        }

        tabs.set(clientId, {
          id: clientId,
          url: data.url,
          title: data.title,
        });

        await broadcastUpdate();
      },
    );

    // 2. Handle Tab Update (When URL or Title changes)
    engine.addMessageListener(
      'tab:update',
      /**
       * Processes update messages to refresh existing tab information.
       */ async (msg) => {
        const { data, clientId } = msg;

        if (typeof data?.url !== 'string' || typeof data?.title !== 'string') {
          throw new TypeError(
            '[TinyTabManagerPlugin] tab:update: data must contain url (string) and title (string).',
          );
        }

        if (tabs.has(clientId)) {
          tabs.set(clientId, {
            id: clientId,
            url: data.url,
            title: data.title,
          });
          await broadcastUpdate();
        }
      },
    );

    // 3. Handle Tab Unregistration (When a tab is closed)
    engine.addMessageListener(
      'tab:unregister',
      /**
       * Processes unregistration messages to remove tabs from the registry.
       */ async (msg) => {
        const { clientId } = msg;

        if (tabs.has(clientId)) {
          tabs.delete(clientId);
          await broadcastUpdate();
        }
      },
    );

    // 4. Handle Request for current list (Manual polling)
    engine.addMessageListener(
      'tab:get_list',
      /**
       * Listens for requests to retrieve the current list of all registered tabs.
       */ async (msg) => {
        const tabList = {
          count: tabs.size,
          tabs: Array.from(tabs.values()),
        };

        // Reply directly to the source of the request
        msg.reply('tab:list_response', tabList);
      },
    );
  });

  return layer;
};

export default TinyTabManagerPlugin;
