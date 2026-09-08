import TinyDebugger from 'tiny-essentials/libs/tools/TinyDebugger';
import TinyVersion from 'tiny-essentials/libs/plugin/TinyVersion';

/**
 * @typedef {import('tiny-essentials/libs/tools/TinyDebugger').DebuggerConstructor} DebuggerConstructor
 */

/**
 * @template {TinyPluginCore<any, string, string, any[]>} Engine
 */
class TinyPluginCore extends TinyDebugger {
  /** @type {Map<string, TinyPlugin<Engine, string, string, any[]>>} A map of registered plugins. */
  #plugins = new Map();

  /**
   * Returns a plain object representation of the registered plugins.
   * This converts the internal Map into a standard object, providing a snapshot
   * of the plugins for easier external access.
   * @returns {Record<string, TinyPlugin<Engine, string, string, any[]>>} An object where keys are plugin names and values are the plugin instances.
   */
  get plugins() {
    return Object.fromEntries(this.#plugins);
  }

  /**
   * @param {DebuggerConstructor} ops
   */
  constructor(ops) {
    super(ops);
  }

  /**
   * Installs a new plugin into the engine and starts its lifecycle.
   * @template {string} Id
   * @template {string} Version
   * @template {any[]} Options
   * @param {TinyPluginInstaller<this, Id, Version, Options>} plugin - The plugin instance to be registered.
   * @param {Options} options - Configuration options for the plugin.
   * @returns {TinyPlugin<this, Id, Version, Options>}
   */
  installPlugin(plugin, ...options) {
    return TinyPlugin.addModuleToCore(this, plugin, ...options);
  }

  /**
   * Registers a plugin instance into the engine's internal plugin registry.
   *
   * @param {TinyPlugin<Engine, string, string, any[]>} plugin - The plugin instance to be registered.
   */
  _addPlugin(plugin) {
    this.#plugins.set(plugin.id, plugin);
  }

  /**
   * Checks if a specific plugin is already registered in the engine's internal registry.
   *
   * @param {TinyPlugin<Engine, string, string, any[]>|string} plugin - The plugin instance to check.
   * @returns {boolean} True if the plugin is registered, false otherwise.
   */
  hasPlugin(plugin) {
    return this.#plugins.has(typeof plugin === 'string' ? plugin : plugin.id);
  }

  /**
   * @param {string} key
   * @returns {TinyPlugin<Engine, string, string, any[]>|undefined}
   */
  getPlugin(key) {
    return this.#plugins.get(key);
  }
}

/**
 * A function used to install a plugin into the engine.
 * @template {TinyPluginCore<any, IdString, VersionString, Options>} Engine
 * @template {string} IdString
 * @template {string} VersionString
 * @template {any[]} Options
 * @typedef { (plugin: TinyPlugin<Engine, IdString, VersionString, Options>, ...options: Options) => void } TinyPluginInstaller
 */

/**
 * Represents a plugin instance designed to be integrated into a main engine.
 * It encapsulates the plugin's identity (id and version), its connection to the engine,
 * the installation logic, and any associated configuration options.
 *
 * @template {TinyPluginCore<any, IdString, VersionString, Options>} Engine
 * @template {string} IdString
 * @template {string} VersionString
 * @template {any[]} Options
 */
class TinyPlugin {
  /**
   * Installs a new plugin into a engine and starts its lifecycle.
   * @template {TinyPluginCore<any, ExternalIdString, ExternalVersionString, ExternalOptions>} ExternalEngine
   * @template {string} ExternalIdString
   * @template {string} ExternalVersionString
   * @template {any[]} ExternalOptions
   * @param {ExternalEngine} engine - The main instance connected to plugin.
   * @param {TinyPluginInstaller<ExternalEngine, ExternalIdString, ExternalVersionString, ExternalOptions>} plugin - The plugin instance to be registered.
   * @param {ExternalOptions} options - Configuration options for the plugin.
   * @returns {TinyPlugin<ExternalEngine, ExternalIdString, ExternalVersionString, ExternalOptions>} - The plugin instance.
   */
  static addModuleToCore(engine, plugin, ...options) {
    if (!(engine instanceof TinyPluginCore)) throw new Error('');
    /** @type {TinyPlugin<ExternalEngine, ExternalIdString, ExternalVersionString, ExternalOptions>} */
    const instance = new TinyPlugin({ engine: engine, installer: plugin }, ...options);
    instance.start();
    if (engine.hasPlugin(instance))
      throw new Error(`A plugin with the name "${instance.id}" is already registered.`);
    engine._addPlugin(instance);
    return instance;
  }

  /** @type {IdString} The unique id of the plugin. */
  // @ts-ignore
  #id = '';
  /** @type {string} */
  #description = '';
  /** @type {string[]} */
  #authors = [];
  /** @type {string[]} */
  #contributors = [];
  /** @type {TinyVersion<VersionString>|null} The version string of the plugin. */
  #version = null;
  /** @type {Engine} The engine instance this plugin is attached to. */
  #engine;
  /** @type {TinyPluginInstaller<Engine, IdString, VersionString, Options>} The installer function used to initialize the plugin. */
  #installer;
  /** @type {Options} An array of configuration options provided to the plugin. */
  #options;
  /** @type {boolean} Indicates whether the plugin has already been started and is ready. */
  #isReady = false;

  get plugins() {
    return this.#engine.plugins;
  }

  /**
   * @param {string} id
   */
  getPlugin(id) {
    return this.#engine.getPlugin(id);
  }

  /**
   * @param {TinyPlugin<Engine, any>|string} plugin - The plugin instance to check.
   * @returns {boolean} True if the plugin is registered, false otherwise.
   */
  hasPlugin(plugin) {
    return this.#engine.hasPlugin(plugin);
  }

  /**
   * Gets the readiness status of the plugin.
   * @returns {boolean} True if the plugin is ready, false otherwise.
   */
  get isReady() {
    return this.#isReady;
  }

  /**
   * Gets the id of the plugin.
   * @returns {IdString} The plugin id.
   */
  get id() {
    if (this.#id.length === 0) throw new Error('Plugin id is not set.');
    return this.#id;
  }

  /**
   * Sets the id of the plugin.
   * @param {IdString} value - The new id for the plugin.
   * @throws {Error} If the id is already set.
   * @throws {TypeError} If the value is not a string or is empty.
   */
  set id(value) {
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
    if (this.#description.length === 0) throw new Error('Plugin description is not set.');
    return this.#description;
  }

  /**
   * Sets the description of the plugin.
   * @param {string} value - The new description for the plugin.
   * @throws {Error} If the description is already set.
   * @throws {TypeError} If the value is not a string or is empty.
   */
  set description(value) {
    if (this.#description.length !== 0) throw new Error('Description is already set.');
    if (typeof value !== 'string') throw new TypeError('Description must be a string.');
    if (value.length === 0) throw new TypeError('Description cannot be empty.');
    this.#description = value;
  }

  /**
   * Gets the authors of the plugin.
   * @returns {readonly string[]} The plugin authors.
   */
  get authors() {
    if (this.#authors.length === 0) throw new Error('Plugin authors is not set.');
    return Object.freeze([...this.#authors]);
  }

  /**
   * Sets the authors of the plugin.
   * @param {string[]} value - The new authors list for the plugin.
   * @throws {Error} If the authors is already set.
   * @throws {TypeError} If the value is not a array of strings or is empty.
   */
  set authors(value) {
    if (this.#authors.length !== 0) throw new Error('Authors is already set.');
    if (
      !Array.isArray(value) ||
      !value.every((v) => typeof v === 'string' && v.trim().length !== 0)
    )
      throw new TypeError('Authors must be a array of non-empty strings.');
    if (value.length === 0) throw new TypeError('Authors cannot be empty.');
    this.#authors = [...new Set([...value])];
  }

  /**
   * Gets the contributors of the plugin.
   * @returns {readonly string[]} The plugin contributors.
   */
  get contributors() {
    if (this.#contributors.length === 0) throw new Error('Plugin contributors is not set.');
    return Object.freeze([...this.#contributors]);
  }

  /**
   * Sets the contributors of the plugin.
   * @param {string[]} value - The new contributors list for the plugin.
   * @throws {Error} If the contributors is already set.
   * @throws {TypeError} If the value is not a array of strings or is empty.
   */
  set contributors(value) {
    if (this.#contributors.length !== 0) throw new Error('Authors is already set.');
    if (
      !Array.isArray(value) ||
      !value.every((v) => typeof v === 'string' && v.trim().length !== 0)
    )
      throw new TypeError('Authors must be a array of non-empty strings.');
    if (value.length === 0) throw new TypeError('Authors cannot be empty.');
    this.#contributors = [...new Set([...value])];
  }

  /**
   * Gets the version of the plugin.
   * @returns {string} The plugin version.
   */
  get version() {
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
    if (!this.#version) throw new Error('Plugin version is not set.');
    return this.#version;
  }

  /**
   * Gets the engine instance associated with this plugin.
   * @returns {Engine} The engine instance.
   */
  get engine() {
    return this.#engine;
  }

  /**
   * Gets the configuration options of the plugin.
   * @returns {Options} A read-only array of options.
   */
  get options() {
    return this.#options;
  }

  /**
   * Initializes a new instance of TinyPlugin.
   * @param {Object} config - The configuration object.
   * @param {Engine} config.engine - The engine instance.
   * @param {TinyPluginInstaller<Engine, IdString, VersionString, Options>} config.installer - The installer function.
   * @param {Options} ops - Additional configuration options.
   */
  constructor({ engine, installer }, ...ops) {
    this.#engine = engine;
    this.#installer = installer;
    this.#options = ops;
  }

  /**
   * Starts the plugin lifecycle by calling the installer.
   * @throws {Error} If id or version are not set.
   */
  start() {
    if (this.#isReady) throw new Error('Plugin is already ready.');
    this.#installer(this, ...this.#options);
    if (this.#id.length === 0) throw new Error('Plugin id is not set.');
    if (this.#description.length === 0) throw new Error('Plugin description is not set.');
    if (this.#authors.length === 0) throw new Error('Plugin authors is not set.');
    if (this.#contributors.length === 0) throw new Error('Plugin contributors is not set.');
    if (!this.#version) throw new Error('Plugin version is not set.');
  }
}

export { TinyPlugin, TinyPluginCore };
