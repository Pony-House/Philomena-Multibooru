import TinyPromiseQueue from 'tiny-essentials/libs/utils/TinyPromiseQueue';
import { TinyPluginLayer } from 'tiny-essentials/libs/plugin/TinyPlugin';
import TinyServiceWorkerEngine from 'tiny-essentials/libs/router/pwa/TinyServiceWorkerEngine';
import { sw } from '../config.mjs';

/** @typedef {import('tiny-essentials/libs/tools/TinyDebugger').DebuggerConstructor} DebuggerConstructor - The constructor function for a debugger instance. */

/**
 * Represents information about a single browser tab.
 * @typedef {Object} TabInfo
 * @property {string} id - The unique Client ID provided by the browser.
 * @property {string} url - The current URL of the tab.
 * @property {string} title - The document title of the tab.
 * @property {boolean} isFocused - Whether the tab currently has window focus.
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
   * A queue used to manage and sequence asynchronous operations to prevent race conditions.
   * @type {TinyPromiseQueue}
   */
  #queue = new TinyPromiseQueue();

  /**
   * Gets the internal promise queue instance.
   * @returns {TinyPromiseQueue} - The instance of the promise queue.
   */
  get queue() {
    return this.#queue;
  }

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
   * A promise that resolves to the IndexedDB database instance.
   * @type {Promise<IDBDatabase> | undefined}
   */
  #dbPromise;

  /**
   * Initializes the database connection for persistence.
   * @returns {Promise<IDBDatabase>}
   */
  async #getDB() {
    if (this.#dbPromise) return this.#dbPromise;

    this.#dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open('TinySwTabsDB', 1);

      request.onupgradeneeded = () => {
        request.result.createObjectStore('tabs');
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.#dbPromise;
  }

  /**
   * Loads the tab registry from IndexedDB into the in-memory Map.
   * @returns {Promise<void>}
   */
  async #loadFromStorage() {
    const db = await this.#getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('tabs', 'readonly');
      const store = transaction.objectStore('tabs');
      const request = store.getAll();

      request.onsuccess = () => {
        const data = request.result;
        this.#tabs.clear();
        // Data is stored as an array of TabInfo objects
        data.forEach((tab) => {
          this.#tabs.set(tab.id, tab);
        });
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Synchronizes the current in-memory Map with the IndexedDB storage.
   * @returns {Promise<void>}
   */
  async persist() {
    const db = await this.#getDB();
    return this.#queue.enqueue(
      () =>
        new Promise((resolve, reject) => {
          const transaction = db.transaction('tabs', 'readwrite');
          const store = transaction.objectStore('tabs');

          // Clear existing registry to ensure deletions are reflected
          store.clear();

          for (const [id, tab] of this.#tabs.entries()) {
            store.put(tab, id);
          }

          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
        }),
    );
  }

  /**
   * Retrieves a snapshot of all tabs currently managed by the instance corresponding to the provided key.
   * @param {number} key - The unique key of the instance to retrieve tabs from.
   * @returns {Record<string, TabInfo>|null} - An object mapping tab IDs to their information, or null if the instance is not found.
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
   * @param {string} id - The unique identifier of the tab.
   * @returns {TabInfo|null} - The tab information if found, or null if the tab does not exist.
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
   * Initializes the layer, loads persisted data, and begins monitoring tab changes.
   * @param {(tabs: TabInstance) => void} callback - The callback function to be executed with the current tabs upon initialization.
   */
  _start(callback) {
    this.#queue.enqueue(() => this.#loadFromStorage());
    return this._startLayer(callback, this.#tabs);
  }

  /**
   * Initializes a new instance of the TinySwTabsLayer, assigning it a unique key and registering it in the static instances registry.
   * @param {Partial<DebuggerConstructor>} [lgConfig] - Configuration options for the instance.
   */
  constructor(lgConfig = {}) {
    super({
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
 * @type {import('tiny-essentials/libs/router/pwa/TinyServiceWorkerEngine').SwPluginInstaller<TinySwTabsLayer, 'TabManager', '1.0.0', [Partial<DebuggerConstructor>]|[]>} - The plugin installer for the Tab Manager.
 */
const TinyTabManagerPlugin = (instance, lgConfig = {}) => {
  const engine = instance.engine;

  /**
   * Stores permission settings per client ID.
   * @type {Map<string, {allowFocusTracking: boolean, allowTabClosing: boolean}>}
   */
  const clientPermissions = new Map();

  instance.id = 'TabManager';
  instance.version = '1.0.0';
  instance.description = 'Advanced tab manager.';
  instance.authors = ['JasminDreasond'];
  instance.contributors = ['JasminDreasond'];
  instance.categories = ['tab-manager'];
  instance.tags = ['management', 'consistency'];
  instance.allowedGets = ['getTab'];

  if (!(engine instanceof TinyServiceWorkerEngine)) {
    throw new TypeError('Plugin requires a TinyServiceWorkerEngine instance to function.');
  }

  const layer = new TinySwTabsLayer(lgConfig);
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

    /**
     * Compares the in-memory tab registry with the actual browser clients.
     * Removes any tabs that are no longer active in the browser.
     * @returns {Promise<void>}
     */
    const reconcileTabs = async () => {
      const activeClients = await layer.queue.enqueue(() => sw.clients.matchAll());
      const activeIds = new Set(activeClients.map((client) => client.id));
      let ghostFound = false;

      for (const id of tabs.keys()) {
        if (!activeIds.has(id)) {
          tabs.delete(id);
          ghostFound = true;
        }
      }

      if (ghostFound) {
        await layer.persist();
        await broadcastUpdate();
      }
    };

    // 1. Handle Tab Registration (When a new tab opens)
    engine.onApi(
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

        // Store permissions sent by the client
        clientPermissions.set(
          clientId,
          data.permissions ?? {
            allowFocusTracking: true,
            allowTabClosing: true,
          },
        );

        // Perform reconciliation to clean up ghosts before adding new entries
        await reconcileTabs();

        tabs.set(clientId, {
          id: clientId,
          url: data.url,
          title: data.title,
          isFocused: data.isFocused,
        });

        await layer.persist(); // Persist to IndexedDB
        await broadcastUpdate();
      },
    );

    // 2. Single Tab Closing
    engine.onApi('tab:close_single', async (msg) => {
      if (!msg.data) return;
      const { id } = msg.data;

      // Check if the client has authorized tab closing
      const permissions = clientPermissions.get(id);
      if (permissions && !permissions.allowTabClosing) {
        return { closed: false, reason: 'Permission denied by client.' };
      }

      const client = await sw.clients.get(id);
      if (client) {
        const response = await engine.emitApi(client, 'tab:close');
        return { closed: !!response?.authorized };
      }
      return { closed: false };
    });

    // 3. Multiple Tab Closing
    engine.onApi('tab:close_multiple', async (msg) => {
      if (!msg.data) return;
      const { ids } = msg.data;
      const results = [];
      if (!Array.isArray(ids)) throw new TypeError('ids must be an array');
      for (const id of ids) {
        const permissions = clientPermissions.get(id);
        if (permissions && !permissions.allowTabClosing) {
          results.push(-1);
          continue;
        }

        const client = await sw.clients.get(id);
        if (client) {
          const response = await engine.emitApi(client, 'tab:close');
          results.push(!!response?.authorized ? 1 : 0);
        } else {
          results.push(0);
        }
      }
      return { closed: results };
    });

    // 4. Close All Tabs
    engine.onApi('tab:close_all', async () => {
      const clients = await sw.clients.matchAll();
      for (const client of clients) {
        await engine.emitApi(client, 'tab:close');
      }
    });

    // 5. Handle Tab Unregistration (When a tab is closed)
    engine.onApi(
      'tab:unregister',
      /**
       * Processes unregistration messages to remove tabs from the registry.
       */ async (msg) => {
        const { clientId } = msg;

        if (tabs.has(clientId)) {
          tabs.delete(clientId);
          await layer.persist(); // Persist to IndexedDB
          await broadcastUpdate();
        }

        // Reconcile to ensure state consistency
        await reconcileTabs();
      },
    );

    // 6. Handle Request for current list (Manual polling)
    engine.onApi(
      'tab:get_list',
      /**
       * Listens for requests to retrieve the current list of all registered tabs.
       */ async () => {
        // Ensure we are providing the most up-to-date list possible
        await reconcileTabs();

        // Reply directly to the source of the request
        return { count: tabs.size, tabs: Array.from(tabs.values()) };
      },
    );

    // 7. Handle Request for a specific tab
    engine.onApi(
      'tab:get_tab',
      /**
       * Processes requests to retrieve information for a specific tab by its ID.
       * @returns {Promise<TabInfo|undefined>} - The tab information or null if not found.
       */ async (msg) => {
        if (!msg.data) return;
        const { id } = msg.data;
        if (typeof id !== 'string') {
          throw new TypeError('[TinyTabManagerPlugin] tab:get_tab: data must contain id (string).');
        }

        const tab = tabs.get(id);

        // Return a copy to prevent direct mutation of the registry
        return tab ? { ...tab } : undefined;
      },
    );
  });

  return layer;
};

export default TinyTabManagerPlugin;
