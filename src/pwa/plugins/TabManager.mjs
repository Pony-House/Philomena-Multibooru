import { TinyPluginLayer } from '../TinyPlugin.mjs';
import TinyServiceWorkerEngine from '../TinyServiceWorkerEngine.mjs';

/**
 * @typedef {Object} TabInfo
 * @property {string} id - The unique Client ID provided by the browser.
 * @property {string} url - The current URL of the tab.
 * @property {string} title - The document title of the tab.
 */

/**
 * @typedef {Object} TabList
 * @property {number} count - Total number of open tabs.
 * @property {TabInfo[]} tabs - Array of tab information.
 */

/**
 * @typedef {Object} TabMessagePayload
 * @property {string} type - The message type (e.g., 'tab:register', 'tab:update', 'tab:unregister').
 * @property {Partial<TabInfo>} [data] - The data associated with the tab update.
 */

/**
 * @typedef {Map<string, TabInfo>} TabInstance
 */

class TinySwTabsLayer extends TinyPluginLayer {
  /** @type {Set<TabInstance>} */
  static #instances = new Set();

  /** @type {number} */
  #key;

  /** @type {TabInstance} */
  #tabs = new Map();

  #layersStarted = false;

  /**
   * @param {number} key
   * @returns {Record<string, TabInfo>|null}
   */
  static getTabsInstance(key) {
    const instance = [...TinySwTabsLayer.#instances][key];
    if (!instance) return null;

    /** @type {Record<string, TabInfo>} */
    const tabs = {};
    instance.forEach((tab, key) => {
      tabs[key] = { ...tab };
    });

    return tabs;
  }

  /**
   * @param {string} id
   * @returns {TabInfo|null}
   */
  getTab(id) {
    const instance = [...TinySwTabsLayer.#instances][this.#key];
    if (!instance) throw new Error('');
    const tab = instance.get(id);
    if (!tab) return null;
    return { ...tab };
  }

  /**
   * @param {(tabs: TabInstance) => void} callback
   */
  _start(callback) {
    if (this.#layersStarted) throw new Error('');
    callback(this.#tabs);
    this.#layersStarted = true;
  }

  constructor() {
    super();
    TinySwTabsLayer.#instances.add(this.#tabs);
    this.#key = this.#tabs.size - 1;
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
    engine.addMessageListener('tab:register', async (msg) => {
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
    });

    // 2. Handle Tab Update (When URL or Title changes)
    engine.addMessageListener('tab:update', async (msg) => {
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
    });

    // 3. Handle Tab Unregistration (When a tab is closed)
    engine.addMessageListener('tab:unregister', async (msg) => {
      const { clientId } = msg;

      if (tabs.has(clientId)) {
        tabs.delete(clientId);
        await broadcastUpdate();
      }
    });

    // 4. Handle Request for current list (Manual polling)
    engine.addMessageListener('tab:get_list', async (msg) => {
      const tabList = {
        count: tabs.size,
        tabs: Array.from(tabs.values()),
      };

      // Reply directly to the source of the request
      msg.reply('tab:list_response', tabList);
    });
  });

  return layer;
};

export default TinyTabManagerPlugin;
