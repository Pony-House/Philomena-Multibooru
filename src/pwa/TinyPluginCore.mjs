import TinyDebugger from 'tiny-essentials/libs/tools/TinyDebugger';

/**
 * @typedef {import('tiny-essentials/libs/tools/TinyDebugger').DebuggerConstructor} DebuggerConstructor
 */

/**
 * @template {TinyPluginCore<any, Options>} Engine
 * @template {any[]} Options
 * @typedef {import('./TinyPlugin.mjs').default<Engine, Options>} TinyPlugin
 */

/**
 * @template {TinyPluginCore<any, Options>} Engine
 * @template {any[]} Options
 */
class TinyPluginCore extends TinyDebugger {
  /**
   * @param {DebuggerConstructor} ops
   */
  constructor(ops) {
    super(ops);
  }

  /** @type {Map<string, TinyPlugin<Engine, Options>>} A map of registered plugins. */
  #plugins = new Map();

  /**
   * Registers a plugin instance into the engine's internal plugin registry.
   *
   * @param {TinyPlugin<Engine, Options>} plugin - The plugin instance to be registered.
   */
  _addPlugin(plugin) {
    this.#plugins.set(plugin.id, plugin);
  }

  /**
   * Checks if a specific plugin is already registered in the engine's internal registry.
   *
   * @param {TinyPlugin<Engine, Options>|string} plugin - The plugin instance to check.
   * @returns {boolean} True if the plugin is registered, false otherwise.
   */
  _hasPlugin(plugin) {
    return this.#plugins.has(typeof plugin === 'string' ? plugin : plugin.id);
  }

  /**
   * @param {string} key
   * @returns {TinyPlugin<Engine, Options>|undefined}
   */
  _getPlugin(key) {
    return this.#plugins.get(key);
  }

  /**
   * @returns {Record<string, TinyPlugin<Engine, Options>>}
   */
  _getAllPlugins() {
    return Object.fromEntries(this.#plugins);
  }

  /**
   * Returns a plain object representation of the registered plugins.
   * This converts the internal Map into a standard object, providing a snapshot
   * of the plugins for easier external access.
   * @returns {Record<string, TinyPlugin<Engine, Options>>} An object where keys are plugin names and values are the plugin instances.
   */
  get plugins() {
    return Object.fromEntries(this.#plugins);
  }
}

export default TinyPluginCore;
