import { TinyPluginLayer } from 'tiny-essentials/libs/plugin/TinyPlugin';
import TinyServiceWorker from 'tiny-essentials/libs/router/TinyServiceWorker';

/** @typedef {import('tiny-essentials/libs/tools/TinyDebugger').DebuggerConstructor} DebuggerConstructor - The constructor function for a debugger instance. */

class TinySwTabsLayer extends TinyPluginLayer {
  /** @type {TinyServiceWorker} */
  #engine;

  /**
   * Initializes a new instance of the TinySwTabsLayer, assigning it a unique key and registering it in the static instances registry.
   * @param {TinyServiceWorker} engine
   * @param {Partial<DebuggerConstructor>} [lgConfig] - Configuration options for the instance.
   */
  constructor(engine, lgConfig = {}) {
    super({
      sandboxBlacklist: { get: ['getTab'] },
      logCfg: {
        id: '[_blue_TinySW-Tabs_reset_]',
        logger: lgConfig.logger ?? console,
        debugMode: lgConfig.debugMode ?? false,
        useLogColors: lgConfig.useLogColors ?? false,
      },
    });
    this.#engine = engine;
  }
}

/**
 * A plugin for TinyServiceWorker that manages a centralized registry of all open website tabs.
 * @type {import('tiny-essentials/libs/router/TinyServiceWorker').SwPluginInstaller<TinySwTabsLayer, 'TabManager', '1.0.0', [Partial<DebuggerConstructor>]|[]>}
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

  if (!(engine instanceof TinyServiceWorker)) {
    throw new TypeError('Plugin requires a TinyServiceWorker instance to function.');
  }

  const layer = new TinySwTabsLayer(engine, lgConfig);

  return layer;
};

export default TinyTabManagerPlugin;
