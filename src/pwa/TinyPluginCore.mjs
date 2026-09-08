import TinyDebugger from 'tiny-essentials/libs/tools/TinyDebugger';
import TinyPlugin from './TinyPlugin.mjs';

/**
 * @typedef {import('tiny-essentials/libs/tools/TinyDebugger').DebuggerConstructor} DebuggerConstructor
 */

/**
 * A function used to install a plugin into the engine.
 * @template {TinyPluginCore<any, Options>} Engine
 * @template {any[]} Options
 * @typedef {import('./TinyPlugin.mjs').TinyPluginInstaller<Engine, Options>} TinyPluginInstaller
 */

/**
 * @template {TinyPluginCore<any, Options>} Engine
 * @template {any[]} Options
 */
class TinyPluginCore extends TinyDebugger {
  /** @type {Map<string, TinyPlugin<Engine, Options>>} A map of registered plugins. */
  #plugins = new Map();

  /**
   * Returns a plain object representation of the registered plugins.
   * This converts the internal Map into a standard object, providing a snapshot
   * of the plugins for easier external access.
   * @returns {Record<string, TinyPlugin<Engine, Options>>} An object where keys are plugin names and values are the plugin instances.
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
   * @param {TinyPluginInstaller<this, Options>} plugin - The plugin instance to be registered.
   * @param {Options} options - Configuration options for the plugin.
   * @returns {TinyPlugin<this, Options>}
   */
  installPlugin(plugin, ...options) {
    return TinyPlugin.addModuleToCore(this, plugin, ...options);
  }

  /**
   * Registers a plugin instance into the engine's internal plugin registry.
   *
   * @param {TinyPlugin<Engine, Options>} plugin - The plugin instance to be registered.
   */
  addPlugin(plugin) {
    this.#plugins.set(plugin.id, plugin);
  }

  /**
   * Checks if a specific plugin is already registered in the engine's internal registry.
   *
   * @param {TinyPlugin<Engine, Options>|string} plugin - The plugin instance to check.
   * @returns {boolean} True if the plugin is registered, false otherwise.
   */
  hasPlugin(plugin) {
    return this.#plugins.has(typeof plugin === 'string' ? plugin : plugin.id);
  }

  /**
   * @param {string} key
   * @returns {TinyPlugin<Engine, Options>|undefined}
   */
  getPlugin(key) {
    return this.#plugins.get(key);
  }
}

export default TinyPluginCore;
