// import { verify } from 'crypto';
import { isJsonObject } from 'tiny-essentials/basics/objChecker';
import TinyDebugger from 'tiny-essentials/libs/tools/TinyDebugger';
import TinyVersion from 'tiny-essentials/libs/plugin/TinyVersion';
import { createCheckDestroyed } from 'tiny-essentials/libs/utils/tools';

const checkDestroy = createCheckDestroyed('TinyPlugin');

/**
 * # TINY PLUGIN SYSTEM - ADVANCED DEVELOPER GUIDE
 *
 * This system uses a "Double-Layer Validation" architecture to ensure maximum
 * stability and developer experience (DX).
 *
 * ## 1. CORE ENGINE SETUP (The Host)
 * - Create your main application class.
 * - Extend this class from `TinyPluginCore`.
 * - This enables your class to manage the plugin registry and lifecycle.
 *
 * ## 2. PLUGIN ARCHITECTURE (The Guest) - [CRITICAL]
 * To ensure full IDE type-safety and runtime stability, follow this strict pattern:
 *
 * ### A. Define Options (Type Safety)
 * - Create a `&#64;typedef {Object}` for your plugin's configuration options.
 * - Define every property and its type explicitly.
 *
 * ### B. Implement the Installer (The Logic)
 * - Create an isolated JavaScript file for your plugin.
 * - Use the generic `Installer` type from your specific Engine to annotate your function.
 * - **Pattern:** `&#64;type {import('./YourEngine.mjs').YourEngineInstaller<'PluginId', 'Version', [YourOptions]>}`
 * - This allows the IDE to validate the `options` object when you call `installPlugin`.
 *
 * ### C. Runtime Validation (The Safety Net)
 * - Inside the installer function, you **MUST** manually validate the `options` object.
 * - Use `throw new TypeError(...)` for every property defined in your `&#64;typedef`.
 * - This prevents the plugin from entering a "Ready" state if the configuration is invalid.
 *
 * ## 3. [CRITICAL] ARCHITECTURAL INTEGRITY
 * - **NO MUTATION:** Never attempt to manually inject, add, or modify properties or methods on the `instance` (`TinyPlugin`) or the `engine` (`TinyPluginCore`) inside the installer function.
 * - **THE EXTENSION PATTERN (@extended):** If your plugin requires custom methods or properties on the engine, you **must** first create a custom class that extends `TinyPluginCore`. Once your custom subclass is defined, use it as the `Engine` type reference in your plugin's JSDoc.
 * - *Rule:* Expand the core via inheritance **before** implementing the plugin logic.
 *
 * ## 4. PROJECT INTEGRATION
 * - In your main entry point:
 *   1. Import the instance of your `TinyPluginCore` (Engine).
 *   2. Import the plugin installer function.
 *
 * ## 5. INITIALIZATION
 * - Invoke `engine.installPlugin(plugin, ...options)`.
 * - The engine will:
 *   1. Validate the engine instance.
 *   2. Execute your installer (triggering your runtime validation).
 *   3. Register the plugin.
 *   4. Return a fully initialized, ready-to-use plugin instance.
 *
 * @example
 * // Example of a robust plugin implementation:
 * // &#64;type {ExamplePluginInstaller<'ExamplePlugin', '1.0.0', [ExampleOptions]>}
 * const MyPlugin = (instance, options) => {
 *    if (typeof options.key !== 'string') throw new TypeError('...');
 *    // ... implementation
 * };
 */

/**
 * @typedef {import('tiny-essentials/libs/tools/TinyDebugger').DebuggerConstructor} DebuggerConstructor
 */

/**
 * Represents the isolated runtime environment or state container for a plugin.
 * It manages the 'ready' state to ensure the plugin's initialization logic
 * is only executed once.
 */
class TinyPluginLayer {
  #isReady = false;
  /**
   * Internal method to initialize the layer state.
   * @template {any[]} Args - The type of arguments passed to the callback.
   * @param {(...args: Args) => void} [callback] - An optional callback function to execute during initialization.
   * @param {Args} args - The arguments to be passed to the callback.
   * @returns {this} - The current instance of TinyPluginLayer.
   */
  _startLayer(callback, ...args) {
    if (this.#isReady) throw new Error('');
    if (callback) callback(...args);
    this.#isReady = true;
    return this;
  }
}

/** @typedef {string|symbol} BlackListValue */

/**
 * @typedef {Object} BlackListCore
 * @property {Set<BlackListValue>} get
 * @property {Set<BlackListValue>} set
 */

/**
 * @typedef {Object} BlackListCorePartial
 * @property {BlackListValue[]} [get]
 * @property {BlackListValue[]} [set]
 */

/**
 * @typedef {Object} BlackListCoreProtected
 * @property {Readonly<BlackListValue[]>} get
 * @property {Readonly<BlackListValue[]>} set
 */

/**
 * @typedef {Object} BwList
 * @property {Set<BlackListValue>} ids
 * @property {Set<BlackListValue>} authors
 */

/**
 * @typedef {Object} BwListArray
 * @property {BlackListValue[]} ids
 * @property {BlackListValue[]} authors
 */

/**
 * @typedef {Object} BwListProtected
 * @property {readonly BlackListValue[]} ids
 * @property {readonly BlackListValue[]} authors
 */

/**
 * The operational mode for engine access control.
 * @typedef {'none' | 'whitelist' | 'blacklist' | 'cryptographic'} PluginAccessControlMode
 */

/**
 * @typedef {Object} PluginAccessControlPartial
 * @property {PluginAccessControlMode} mode
 * @property {BwListArray} [whitelist]
 * @property {BwListArray} [blacklist]
 * @property {string} [publicKey] - The public key used for cryptographic verification.
 * @property {string} [cryptoAlgorithm='sha256']
 */

/**
 * @typedef {Object} PluginAccessControl
 * @property {PluginAccessControlMode} mode
 * @property {BwList} whitelist
 * @property {BwList} blacklist
 * @property {string|null} publicKey - The public key used for cryptographic verification.
 * @property {string} cryptoAlgorithm
 */

/**
 * The core engine class responsible for managing the plugin lifecycle and registry.
 * It extends TinyDebugger to provide debugging capabilities alongside plugin management.
 */
class TinyPluginCore extends TinyDebugger {
  static #pluginsDestroyEventName = 'pluginsDestroyed';
  /** @type {BlackListCore} */
  #sandboxBlacklist = { get: new Set(), set: new Set() };

  /** @type {PluginAccessControl} */
  #accessControl = {
    mode: 'none',
    cryptoAlgorithm: 'sha256',
    publicKey: null,
    whitelist: { ids: new Set(), authors: new Set() },
    blacklist: { ids: new Set(), authors: new Set() },
  };

  /** @type {Set<string>} */
  #verifiedPlugins = new Set();

  /**
   * Gets the event name used when all plugins are destroyed.
   * @returns {string} The event name.
   */
  static get pluginsDestroyEventName() {
    return TinyPluginCore.pluginsDestroyEventName;
  }

  /**
   * Sets the event name used when all plugins are destroyed.
   * @param {string} value - The new event name.
   * @throws {TypeError} If the value is not a string.
   */
  static set pluginsDestroyEventName(value) {
    if (typeof value !== 'string') throw new TypeError('pluginsDestroyEventName must be a string.');
    TinyPluginCore.pluginsDestroyEventName = value;
  }

  /** @type {Map<string, TinyPlugin<this, TinyPluginLayer, string, string, any[]>>} A map of registered plugins. */
  #plugins = new Map();

  /**
   * Gets the blacklist of restricted keys for the engine.
   * @returns {BlackListCoreProtected} A read-only array of restricted keys.
   */
  get sandboxBlacklist() {
    return Object.freeze({
      set: Object.freeze([...this.#sandboxBlacklist.set]),
      get: Object.freeze([...this.#sandboxBlacklist.get]),
    });
  }

  /**
   * Returns a plain object representation of the registered plugins.
   * This converts the internal Map into a standard object, providing a snapshot
   * of the plugins for easier external access.
   * @returns {Record<string, TinyPlugin<this, TinyPluginLayer, string, string, any[]>>} An object where keys are plugin names and values are the plugin instances.
   */
  get plugins() {
    return Object.fromEntries(this.#plugins);
  }

  /**
   * Gets the total number of registered plugins in the engine.
   * @returns {number} The number of plugins.
   */
  get pluginsSize() {
    return this.#plugins.size;
  }

  /**
   * Gets the current engine access control whitelist.
   * @returns {BwListProtected}
   */
  get accessControlWhitelist() {
    return Object.freeze({
      ids: Object.freeze([...this.#accessControl.whitelist.ids]),
      authors: Object.freeze([...this.#accessControl.whitelist.authors]),
    });
  }

  /**
   * Gets the current engine access control blacklist.
   * @returns {BwListProtected}
   */
  get accessControlBlacklist() {
    return Object.freeze({
      ids: Object.freeze([...this.#accessControl.blacklist.ids]),
      authors: Object.freeze([...this.#accessControl.blacklist.authors]),
    });
  }

  /**
   * Gets the current engine access control mode.
   * @returns {PluginAccessControlMode}
   */
  get accessControlMode() {
    return this.#accessControl.mode;
  }

  /**
   * Initializes a new instance of the TinyPluginCore class.
   * @param {Object} ops - The configuration options.
   * @param {DebuggerConstructor} ops.logCfg - The configuration options for the debugger.
   * @param {BlackListCorePartial} [ops.sandboxBlacklist] - A list of keys to be blacklisted.
   * @param {PluginAccessControlPartial} [ops.accessControl] - Configuration for identity-based engine access.
   */
  constructor(ops) {
    super(ops.logCfg);
    /**
     * @param {string} key
     * @param {BlackListValue[]} values
     */
    const checkBlackList = (key, values) => {
      if (
        !Array.isArray(values) ||
        !values.every((k) => typeof k === 'string' || typeof k === 'symbol')
      ) {
        throw new TypeError(`The ${key} of sandbox blacklist must be an array of strings.`);
      }
    };

    if (isJsonObject(ops?.sandboxBlacklist)) {
      const { get, set } = ops.sandboxBlacklist;
      if (typeof get !== 'undefined') {
        checkBlackList('get', get);
        get.forEach((v) => this.#sandboxBlacklist.get.add(v));
      }
      if (typeof set !== 'undefined') {
        checkBlackList('set', set);
        set.forEach((v) => this.#sandboxBlacklist.set.add(v));
      }
    }

    if (isJsonObject(ops?.accessControl)) {
      const { mode, whitelist, blacklist, publicKey, cryptoAlgorithm } = ops.accessControl;

      if (
        mode !== 'none' &&
        mode !== 'whitelist' &&
        mode !== 'blacklist' &&
        mode !== 'cryptographic'
      ) {
        throw new TypeError(
          'accessControl.mode must be "none", "whitelist", "blacklist", or "cryptographic".',
        );
      }

      if (mode === 'cryptographic') {
        if (typeof publicKey !== 'string') {
          throw new TypeError(
            'In cryptographic mode, accessControl.publicKey must be a string (PEM format).',
          );
        }
        if (typeof cryptoAlgorithm !== 'string') {
          throw new TypeError(
            'In cryptographic mode, accessControl.cryptoAlgorithm must be a string (Crypto algorithm).',
          );
        }
      }

      if (isJsonObject(whitelist)) {
        if (typeof whitelist.ids !== 'undefined') {
          checkBlackList('whitelist ids', whitelist.ids);
          whitelist.ids.forEach((id) => this.#accessControl.whitelist.ids.add(id));
        }
        if (typeof whitelist.authors !== 'undefined') {
          checkBlackList('whistlist authors', whitelist.authors);
          whitelist.authors.forEach((id) => this.#accessControl.whitelist.authors.add(id));
        }
      }

      if (isJsonObject(blacklist)) {
        if (typeof blacklist.ids !== 'undefined') {
          checkBlackList('blacklist ids', blacklist.ids);
          blacklist.ids.forEach((id) => this.#accessControl.blacklist.ids.add(id));
        }
        if (typeof blacklist.authors !== 'undefined') {
          checkBlackList('blacklist authors', blacklist.authors);
          blacklist.authors.forEach((id) => this.#accessControl.blacklist.authors.add(id));
        }
      }

      if (typeof mode === 'string') this.#accessControl.mode = mode;
      if (typeof publicKey === 'string') this.#accessControl.publicKey = publicKey;
      if (typeof cryptoAlgorithm === 'string')
        this.#accessControl.cryptoAlgorithm = cryptoAlgorithm;
    }
  }

  /**
   * Create a deterministic identity string.
   * @param {string} pluginId - The unique identifier of the plugin.
   * @param {string[]} authors - The list of authors of the plugin.
   * @returns {string}
   */
  #createIdChecker(pluginId, authors) {
    if (typeof pluginId !== 'string') {
      throw new TypeError('Security Error: Cryptographic mode enabled, but pluginId is missing.');
    }

    if (!Array.isArray(authors)) {
      throw new TypeError('Security Error: Cryptographic mode enabled, but authors is missing.');
    }
    if (!authors.every((author) => typeof author === 'string')) {
      throw new TypeError('Security Error: Cryptographic mode enabled, but authors is invalid.');
    }

    // We sort authors to ensure the string is identical regardless of input order
    return JSON.stringify({
      id: pluginId,
      authors: [...authors].sort(),
    });
  }

  /**
   * Validates if a plugin is permitted to access the engine's properties based on identity.
   * @param {string} pluginId - The unique identifier of the plugin.
   * @param {string[]} authors - The list of authors of the plugin.
   * @param {string} [signature] - The cryptographic signature provided by the plugin.
   * @returns {boolean} True if access is granted, false otherwise.
   */
  canAccessEngine(pluginId, authors, signature) {
    const { mode, whitelist, blacklist } = this.#accessControl;

    if (mode === 'cryptographic') {
      try {
        // const identity = this.#createIdChecker(pluginId, authors);
        // return verify(cryptoAlgorithm, Buffer.from(identity), publicKey, Buffer.from(signature));
        return false;
      } catch (err) {
        console.error(err);
        return false;
      }
    }

    if (mode === 'whitelist') {
      const isIdAllowed = whitelist.ids.has(pluginId);
      const isAuthorAllowed = authors.some((author) => whitelist.authors.has(author));
      return isIdAllowed || isAuthorAllowed;
    }

    if (mode === 'blacklist') {
      const isIdBlocked = blacklist.ids.has(pluginId);
      const isAuthorBlocked = authors.some((author) => blacklist.authors.has(author));
      return !isIdBlocked && !isAuthorBlocked;
    }

    return true; // 'none' mode allows everyone
  }

  /**
   * Validate asynchronous encryption signature using the native browser API.
   * @param {string} pluginId - The unique identifier of the plugin.
   * @param {string[]} authors - The list of authors of the plugin.
   * @param {string} signature
   * @returns {Promise<boolean>}
   */
  async verifyPluginSignature(pluginId, authors, signature) {
    const { publicKey, cryptoAlgorithm } = this.#accessControl;
    const identity = this.#createIdChecker(pluginId, authors);

    try {
      if (typeof publicKey !== 'string') {
        throw new TypeError(
          'Security Error: Cryptographic mode enabled, but public key is missing.',
        );
      }
      if (typeof signature !== 'string') {
        throw new TypeError(
          'Security Error: Cryptographic mode enabled, but signature key is missing.',
        );
      }

      const encoder = new TextEncoder();
      const dataBytes = encoder.encode(identity);
      const importedPublicKey = encoder.encode(publicKey);
      const signatureBuffer = encoder.encode(identity);

      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        importedPublicKey,
        { name: 'HMAC', hash: cryptoAlgorithm },
        false,
        ['sign', 'verify'],
      );

      const isValid = await crypto.subtle.verify(
        { name: 'RSASSA-PKCS1-v1_5' },
        cryptoKey,
        signatureBuffer,
        dataBytes,
      );

      return isValid;
    } catch (err) {
      console.error(err);
      return false;
    }
  }

  /**
   * Registers a plugin instance into the engine's internal plugin registry.
   *
   * @param {TinyPlugin<this, TinyPluginLayer, string, string, any[]>} plugin - The plugin instance to be registered.
   */
  _addPlugin(plugin) {
    this.#plugins.set(plugin.id, plugin);
  }

  /**
   * Installs a new plugin into the engine and starts its lifecycle.
   * @template {TinyPluginLayer} Layer - The type of the plugin layer.
   * @template {string} Id - The type of the plugin ID.
   * @template {string} Version - The type of the plugin version.
   * @template {any[]} Options - The type of the configuration options.
   * @param {TinyPluginInstaller<this, Layer, Id, Version, Options>} plugin - The plugin instance to be registered.
   * @param {Options} options - Configuration options for the plugin.
   * @returns {TinyPlugin<this, Layer, Id, Version, Options>} The newly installed plugin instance.
   */
  installPlugin(plugin, ...options) {
    return TinyPlugin._addModuleToCore(this, plugin, ...options);
  }

  /**
   * Checks if a specific plugin is already registered in the engine's internal registry.
   * @param {TinyPlugin<this, TinyPluginLayer, string, string, any[]>|string} plugin - The plugin instance or ID to check.
   * @returns {boolean} True if the plugin is registered, false otherwise.
   */
  hasPlugin(plugin) {
    return this.#plugins.has(typeof plugin === 'string' ? plugin : plugin.id);
  }

  /**
   * Retrieves a plugin instance by its unique identifier.
   * @param {string} key - The unique identifier of the plugin to retrieve.
   * @returns {TinyPlugin<this, TinyPluginLayer, string, string, any[]>|undefined} The plugin instance if found, otherwise undefined.
   */
  getPlugin(key) {
    return this.#plugins.get(key);
  }

  /**
   * Retrieves a plugin instance by its unique identifier (SANDBOX MODE).
   * @param {string} key - The unique identifier of the plugin to retrieve.
   * @returns {TinyPlugin<this, TinyPluginLayer, string, string, any[]>|undefined} The plugin instance if found, otherwise undefined.
   */
  _getPlugin(key) {
    return this.#plugins.get(key);
  }

  /**
   * Destroys all registered plugins and emits the destruction event.
   */
  destroyPlugins() {
    this.#verifiedPlugins.clear();
    this.#plugins.forEach((plugin) => plugin.destroy());
    this.emit(TinyPluginCore.#pluginsDestroyEventName);
  }
}

/**
 * A function used to install a plugin into the engine.
 * This function is responsible for the actual initialization logic of the plugin,
 * setting up its layer and validating its configuration.
 *
 * @template {TinyPluginCore} Engine - The type of the engine instance.
 * @template {TinyPluginLayer} Layer - The type of the layer returned by the installer.
 * @template {string} IdString - The type of the plugin's unique identifier.
 * @template {string} VersionString - The type of the plugin's version.
 * @template {any[]} Options - The type of the configuration options.
 *
 * @typedef { (plugin: TinyPlugin<Engine, Layer, IdString, VersionString, Options>, ...options: Options) => Layer } TinyPluginInstaller - The plugin instance being initialized.
 */

/**
 * Represents a plugin instance designed to be integrated into a main engine.
 * It encapsulates the plugin's identity (id and version), its connection to the engine,
 * the installation logic, and any associated configuration options.
 *
 * @template {TinyPluginCore} Engine
 * @template {TinyPluginLayer} Layer
 * @template {string} IdString
 * @template {string} VersionString
 * @template {any[]} Options
 */
class TinyPlugin extends TinyDebugger {
  /** @type {DebuggerConstructor} */
  static #logCfg = {
    id: '[_blue_TinyPlugin_reset_]',
    logger: console,
    debugMode: false,
    canEmitLogs: false,
    useLogColors: true,
  };

  /**
   * Gets the logging configuration for the TinyPlugin class.
   * @returns {DebuggerConstructor} The current logging configuration.
   */
  static get logCfg() {
    return { ...TinyPlugin.#logCfg };
  }

  /**
   * Sets the logging configuration for the TinyPlugin class.
   * @param {DebuggerConstructor} value - The new logging configuration.
   */
  static set logCfg(value) {
    this.#logCfg = value;
  }

  /**
   * Installs a new plugin into a engine and starts its lifecycle.
   * @template {TinyPluginCore} ExternalEngine - The type of the engine.
   * @template {TinyPluginLayer} ExternalLayer - The type of the plugin layer.
   * @template {string} ExternalIdString - The type of the plugin ID.
   * @template {string} ExternalVersionString - The type of the plugin version.
   * @template {any[]} ExternalOptions - The type of the configuration options.
   * @param {ExternalEngine} engine - The main instance connected to plugin.
   * @param {TinyPluginInstaller<ExternalEngine, ExternalLayer, ExternalIdString, ExternalVersionString, ExternalOptions>} plugin - The plugin instance to be registered.
   * @param {ExternalOptions} options - Configuration options for the plugin.
   * @returns {TinyPlugin<ExternalEngine, ExternalLayer, ExternalIdString, ExternalVersionString, ExternalOptions>} - The plugin instance.
   * @throws {TypeError} If the provided engine is not an instance of TinyPluginCore.
   */
  static _addModuleToCore(engine, plugin, ...options) {
    if (!(engine instanceof TinyPluginCore))
      throw new TypeError('The provided engine must be an instance of TinyPluginCore.');
    /** @type {TinyPlugin<ExternalEngine, ExternalLayer, ExternalIdString, ExternalVersionString, ExternalOptions>} */
    const instance = new TinyPlugin(
      { engine: engine, installer: plugin, logCfg: { ...TinyPlugin.#logCfg } },
      ...options,
    );
    instance.start();
    // @ts-ignore
    if (engine.hasPlugin(instance))
      throw new Error(`A plugin with the name "${instance.id}" is already registered.`);
    // @ts-ignore
    engine._addPlugin(instance);
    return instance;
  }

  /** @type {BlackListCore} */
  #sandboxBlacklist = { get: new Set(), set: new Set() };

  /** @type {IdString} The unique id of the plugin. */
  // @ts-ignore
  #id = '';
  /** @type {string} The description of the plugin. */
  #description = '';
  /** @type {Set<string>} The list of authors of the plugin. */
  #authors = new Set();
  /** @type {Set<string>} The list of contributors to the plugin. */
  #contributors = new Set();
  /** @type {TinyVersion<VersionString>|null} The version string of the plugin. */
  #version = null;
  /** @type {Engine} The engine instance this plugin is attached to. */
  #engine;
  /** @type {TinyPluginInstaller<Engine, Layer, IdString, VersionString, Options>} The installer function used to initialize the plugin. */
  #installer;
  /** @type {Options} An array of configuration options provided to the plugin. */
  #options;
  /** @type {boolean} Indicates whether the plugin has already been started and is ready. */
  #isReady = false;
  /** @type {Layer|null} */
  #layer = null;
  /** @type {boolean} */
  #isDestroyed = false;

  /**
   * Gets whether the plugin has been destroyed.
   * @returns {boolean} True if destroyed, false otherwise.
   */
  get isDestroyed() {
    return this.#isDestroyed;
  }

  /**
   * Gets the plugin's layer instance.
   * @returns {Layer} The plugin layer.
   */
  get layer() {
    checkDestroy(this.#isDestroyed);
    if (this.#layer === null) throw new Error('Plugin layer is not set.');
    return this.#layer;
  }

  /**
   * Gets the plugins object from the engine.
   * @returns {string[]} The plugins object from the engine.
   */
  get plugins() {
    checkDestroy(this.#isDestroyed);
    return Object.keys(this.#engine.plugins);
  }

  /**
   * Gets the total number of plugins in the engine.
   * @returns {number} The number of plugins.
   */
  get pluginsSize() {
    checkDestroy(this.#isDestroyed);
    return this.#engine.pluginsSize;
  }

  /**
   * Retrieves the plugin instance associated with the given ID from the engine.
   * @param {string} id - The unique identifier of the plugin.
   * @returns {TinyPlugin<Engine, TinyPluginLayer, string, string, any[]>|undefined} The plugin instance if found, otherwise undefined.
   */
  getPlugin(id) {
    checkDestroy(this.#isDestroyed);
    return this.#engine._getPlugin(id);
  }

  /**
   * Checks if the specified plugin or ID is registered in the engine.
   * @param {TinyPlugin<Engine, TinyPluginLayer, string, string, any[]>|string} plugin - The plugin instance to check.
   * @returns {boolean} True if the plugin is registered, false otherwise.
   */
  hasPlugin(plugin) {
    checkDestroy(this.#isDestroyed);
    return this.#engine.hasPlugin(plugin);
  }

  /**
   * Gets the readiness status of the plugin.
   * @returns {boolean} True if the plugin is ready, false otherwise.
   */
  get isReady() {
    checkDestroy(this.#isDestroyed);
    return this.#isReady;
  }

  /**
   * Gets the unique identifier of the plugin.
   * @returns {IdString} The plugin id.
   */
  get id() {
    checkDestroy(this.#isDestroyed);
    if (this.#id.length === 0) throw new Error('Plugin id is not set.');
    return this.#id;
  }

  /**
   * Sets the unique identifier for the plugin.
   * @param {IdString} value - The new id for the plugin.
   * @throws {Error} If the id is already set.
   * @throws {TypeError} If the value is not a string or is empty.
   */
  set id(value) {
    checkDestroy(this.#isDestroyed);
    if (this.#id.length !== 0) throw new Error('Id is already set.');
    if (typeof value !== 'string') throw new TypeError('Id must be a string.');
    if (value.length === 0) throw new TypeError('Id cannot be empty.');
    this.#id = value;
  }

  /**
   * Gets the description of the plugin.
   * @returns {string} The plugin description.
   */
  get description() {
    checkDestroy(this.#isDestroyed);
    if (this.#description.length === 0) throw new Error('Plugin description is not set.');
    return this.#description;
  }

  /**
   * Sets the description for the plugin.
   * @param {string} value - The new description for the plugin.
   * @throws {Error} If the description is already set.
   * @throws {TypeError} If the value is not a string or is empty.
   */
  set description(value) {
    checkDestroy(this.#isDestroyed);
    if (this.#description.length !== 0) throw new Error('Description is already set.');
    if (typeof value !== 'string') throw new TypeError('Description must be a string.');
    if (value.length === 0) throw new TypeError('Description cannot be empty.');
    this.#description = value;
  }

  /**
   * Gets the list of authors for the plugin.
   * @returns {readonly string[]} The plugin authors.
   */
  get authors() {
    checkDestroy(this.#isDestroyed);
    if (this.#authors.size === 0) throw new Error('Plugin authors is not set.');
    return Object.freeze([...this.#authors]);
  }

  /**
   * Sets the list of authors for the plugin.
   * @param {string[]} value - The new authors list for the plugin.
   * @throws {Error} If the authors is already set.
   * @throws {TypeError} If the value is not a array of strings or is empty.
   */
  set authors(value) {
    checkDestroy(this.#isDestroyed);
    if (this.#authors.size !== 0) throw new Error('Authors is already set.');
    if (
      !Array.isArray(value) ||
      !value.every((v) => typeof v === 'string' && v.trim().length !== 0)
    )
      throw new TypeError('Authors must be a array of non-empty strings.');
    if (value.length === 0) throw new TypeError('Authors cannot be empty.');
    value.forEach((v) => this.#authors.add(v));
  }

  /**
   * Gets the list of contributors for the plugin.
   * @returns {readonly string[]} The plugin contributors.
   */
  get contributors() {
    checkDestroy(this.#isDestroyed);
    if (this.#contributors.size === 0) throw new Error('Plugin contributors is not set.');
    return Object.freeze([...this.#contributors]);
  }

  /**
   * Sets the list of contributors for the plugin.
   * @param {string[]} value - The new contributors list for the plugin.
   * @throws {Error} If the contributors is already set.
   * @throws {TypeError} If the value is not a array of strings or is empty.
   */
  set contributors(value) {
    checkDestroy(this.#isDestroyed);
    if (this.#contributors.size !== 0) throw new Error('Authors is already set.');
    if (
      !Array.isArray(value) ||
      !value.every((v) => typeof v === 'string' && v.trim().length !== 0)
    )
      throw new TypeError('Authors must be a array of non-empty strings.');
    if (value.length === 0) throw new TypeError('Authors cannot be empty.');
    value.forEach((v) => this.#contributors.add(v));
  }

  /**
   * Gets the version of the plugin as a string.
   * @returns {VersionString} The plugin version.
   */
  get version() {
    checkDestroy(this.#isDestroyed);
    if (!this.#version) throw new Error('Plugin version is not set.');
    return this.#version.toString();
  }

  /**
   * Sets the version of the plugin.
   * @param {VersionString} value - The new version string.
   * @throws {Error} If the version is already set.
   * @throws {TypeError} If the value is not a string or is empty.
   */
  set version(value) {
    checkDestroy(this.#isDestroyed);
    if (this.#version) throw new Error('Version is already set.');
    if (typeof value !== 'string') throw new TypeError('Version must be a string.');
    if (value.length === 0) throw new TypeError('Version cannot be empty.');
    this.#version = new TinyVersion(value);
  }

  /**
   * Retrieves the current version of the plugin as a TinyVersion instance.
   * @returns {TinyVersion<VersionString>} The TinyVersion instance representing the plugin's version.
   */
  get tinyVersion() {
    checkDestroy(this.#isDestroyed);
    if (!this.#version) throw new Error('Plugin version is not set.');
    return this.#version;
  }

  /**
   * Gets the engine instance associated with this plugin.
   * The engine is proxied to prevent unauthorized access to internal methods.
   * @returns {Engine} The engine instance.
   * @throws {Error} If the plugin is denied access to the engine by the access control rules.
   */
  get engine() {
    checkDestroy(this.#isDestroyed);

    // Identity-based security check
    if (!this.#engine.canAccessEngine(this.#id, [...this.#authors])) {
      throw new Error(
        `Security Error: Access to the engine is denied for plugin "${this.id}" based on current access control rules.`,
      );
    }

    const sandboxBlacklist = this.#sandboxBlacklist;
    return new Proxy(this.#engine, {
      get(target, prop) {
        if (sandboxBlacklist.get.has(prop)) {
          // Prevent access to blocked private/internal methods
          throw new Error(
            `Security Error: Access to property "${String(prop)}" is denied by the sandbox.`,
          );
        }
        const value = Reflect.get(target, prop, target);
        return typeof value === 'function' ? value.bind(target) : value;
      },
      set(target, prop, newValue) {
        if (sandboxBlacklist.set.has(prop)) {
          // Prevent the plugin from modifying blocked properties on the sandbox
          throw new Error(
            'Security Error: Cannot modify read-only properties on the plugin sandbox.',
          );
        }
        return Reflect.set(target, prop, newValue);
      },
      // Ensure the prototype is protected
      setPrototypeOf() {
        throw new Error('Security Error: Prototype manipulation is forbidden.');
      },
    });
  }

  /**
   * Gets the configuration options of the plugin.
   * @returns {Options} A read-only array of options.
   */
  get options() {
    checkDestroy(this.#isDestroyed);
    return this.#options;
  }

  /**
   * Gets the blacklist of restricted keys from the engine.
   * This is accessible within the plugin's sandbox for inspection.
   * @returns {BlackListCoreProtected} The blacklist.
   */
  get engineBlacklist() {
    checkDestroy(this.#isDestroyed);
    return this.#engine.sandboxBlacklist;
  }

  /**
   * Initializes a new instance of TinyPlugin.
   * @param {Object} config - The configuration object.
   * @param {Engine} config.engine - The engine instance.
   * @param {DebuggerConstructor} config.logCfg - The logging configuration.
   * @param {TinyPluginInstaller<Engine, Layer, IdString, VersionString, Options>} config.installer - The installer function.
   * @param {Options} ops - Additional configuration options.
   */
  constructor({ engine, logCfg, installer }, ...ops) {
    super(logCfg);
    this.#engine = engine;
    this.#installer = installer;
    this.#options = ops;
  }

  /**
   * Creates a secure proxy to restrict plugin access to the host.
   * This prevents the plugin from accessing the 'engine' or mutating the plugin instance.
   */
  #createSandbox() {
    /** @type {BlackListValue[]} */
    const allowedEditKeys = ['id', 'version', 'description', 'authors', 'contributors'];

    /** @type {BlackListValue[]} */
    const allowedGetKeys = [
      ...allowedEditKeys,
      'tinyVersion',
      'isReady',
      'layer',
      'options',
      'engine',
      'engineBlacklist',
      'isDestroyed',
      'pluginsSize',
      'plugins',
      'hasPlugin',
      'getPlugin',
      'isDestroyed',
    ];

    const coreBlacklist = this.#engine.sandboxBlacklist ?? { get: {}, set: {} };
    /** @type {BlackListValue[]} */
    const blockedGetKeys = [
      'getPlugin',
      'plugins',
      'installPlugin',
      '_addPlugin',
      'destroyPlugins',
      ...coreBlacklist.get,
    ];

    /** @type {BlackListValue[]} */
    const blockedEditKeys = [
      ...blockedGetKeys,
      ...coreBlacklist.set,
      'accessControlMode',
      'accessControlWhitelist',
      'accessControlBlacklist',
      'verifyPluginSignature',
      'canAccessEngine',
    ];

    blockedGetKeys.forEach((key) => this.#sandboxBlacklist.get.add(key));
    blockedEditKeys.forEach((key) => this.#sandboxBlacklist.set.add(key));

    return new Proxy(this, {
      get(target, prop) {
        if (allowedGetKeys.includes(prop)) {
          const value = Reflect.get(target, prop, target);
          return typeof value === 'function' ? value.bind(target) : value;
        }
        // Prevent access to blocked private/internal methods
        throw new Error(
          `Security Error: Access to property "${String(prop)}" is denied by the sandbox.`,
        );
      },
      set(target, prop, newValue) {
        if (allowedEditKeys.includes(prop)) {
          return Reflect.set(target, prop, newValue);
        }
        // Prevent the plugin from modifying blocked properties on the sandbox
        throw new Error(
          'Security Error: Cannot modify read-only properties on the plugin sandbox.',
        );
      },
      // Ensure the prototype is protected
      setPrototypeOf() {
        throw new Error('Security Error: Prototype manipulation is forbidden.');
      },
    });
  }

  /**
   * Starts the plugin lifecycle by calling the installer.
   * @throws {Error} If id, version, description, authors, contributors, or layer is not set.
   */
  start() {
    checkDestroy(this.#isDestroyed);
    if (this.#isReady) throw new Error('Plugin is already ready.');

    // 1. Freeze options to prevent mutation of the configuration object
    if (this.#options) {
      Object.freeze(this.#options);
    }

    // 2. Create a sandboxed version of 'this' to pass to the installer
    const sandbox = this.#createSandbox();

    try {
      // 3. Execute installer with the sandbox and frozen options
      this.#layer = this.#installer(sandbox, ...this.#options);

      if (!(this.#layer instanceof TinyPluginLayer)) {
        throw new TypeError('Plugin layer is not a valid TinyPluginLayer instance.');
      }

      // 4. Final validation of core identity
      if (this.#id.length === 0) throw new Error('Plugin id is not set.');
      if (this.#description.length === 0) throw new Error('Plugin description is not set.');
      if (this.#authors.size === 0) throw new Error('Plugin authors is not set.');
      if (this.#contributors.size === 0) throw new Error('Plugin contributors is not set.');
      if (!this.#version) throw new Error('Plugin version is not set.');

      this.#isReady = true;
    } catch (error) {
      // 5. Catch initialization errors to prevent host crash
      this.emit('error', error);
      this.destroy();
      throw new Error(
        `Plugin initialization failed: ${error instanceof Error ? error.message : 'Unknown Error'}`,
      );
    }
  }

  /**
   * Destroys the plugin instance.
   */
  destroy() {
    if (this.#isDestroyed) return;
    this.emit('destroyed');
    this.#isDestroyed = true;
  }
}

export { TinyPlugin, TinyPluginCore, TinyPluginLayer };
