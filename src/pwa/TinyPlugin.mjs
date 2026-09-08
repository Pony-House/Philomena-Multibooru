
/**
 * A function used to install a plugin into the engine.
 * @template {any} Engine
 * @template {any[]} Options
 * @typedef { (plugin: TinyPlugin<Engine, Options>, ...options: Options) => void } TinyPluginInstaller
 */


/**
 * Represents a plugin instance designed to be integrated into a main engine.
 * It encapsulates the plugin's identity (id and version), its connection to the engine,
 * the installation logic, and any associated configuration options.
 *
 * @template {any} Engine
 * @template {any[]} Options
 */
class TinyPlugin {
  /** @type {string} The unique id of the plugin. */
  #id = '';
  /** @type {string} The version string of the plugin. */
  #version = '';
  /** @type {Engine} The engine instance this plugin is attached to. */
  #engine;
  /** @type {TinyPluginInstaller<Engine, Options>} The installer function used to initialize the plugin. */
  #installer;
  /** @type {Options} An array of configuration options provided to the plugin. */
  #options;
  /** @type {boolean} Indicates whether the plugin has already been started and is ready. */
  #isReady = false;

  /**
   * Gets the readiness status of the plugin.
   * @returns {boolean} True if the plugin is ready, false otherwise.
   */
  get isReady() {
    return this.#isReady;
  }

  /**
   * Gets the id of the plugin.
   * @returns {string} The plugin id.
   */
  get id() {
    return this.#id;
  }

    /**
   * Sets the id of the plugin.
   * @param {string} value - The new id for the plugin.
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
   * Gets the version of the plugin.
   * @returns {string} The plugin version.
   */
  get version() {
    return this.#version;
  }

  /**
   * Sets the version of the plugin.
   * @param {string} value - The new version string.
   * @throws {Error} If the version is already set.
   * @throws {TypeError} If the value is not a string or is empty.
   */
  set version(value) {
    if (this.#version.length !== 0) throw new Error('Version is already set.');
    if (typeof value !== 'string') throw new TypeError('Version must be a string.');
    if (value.length === 0) throw new TypeError('Version cannot be empty.');
    this.#version = value;
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
   * @returns {Readonly<Options>} A read-only array of options.
   */
  get options() {
    return Object.freeze(this.#options);
  }

  /**
   * Initializes a new instance of TinyPlugin.
   * @param {Object} config - The configuration object.
   * @param {Engine} config.engine - The engine instance.
   * @param {TinyPluginInstaller<Engine, Options>} config.installer - The installer function.
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
    if (this.#version.length === 0) throw new Error('Plugin version is not set.');
  }
}

export default TinyPlugin;
