import { TinyPluginLayer } from 'tiny-essentials/libs/plugin/TinyPlugin';
import TinyServiceWorker from 'tiny-essentials/libs/router/TinyServiceWorker';

/** @typedef {import('tiny-essentials/libs/tools/TinyDebugger').DebuggerConstructor} DebuggerConstructor - The constructor function for a debugger instance. */

class TinySwTabsLayer extends TinyPluginLayer {
  /**
   * Initializes a new instance of the TinySwTabsLayer, assigning it a unique key and registering it in the static instances registry.
   * @param {Partial<DebuggerConstructor>} [lgConfig] - Configuration options for the instance.
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
  }
}

/**
 * A plugin for TinyServiceWorker that manages a centralized registry of all open website tabs.
 * @type {import('tiny-essentials/libs/router/TinyServiceWorker').SwPluginInstaller<TinySwTabsLayer, 'TabManager', '1.0.0', []>}
 */
const TinyTabManagerPlugin = (instance) => {
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

  const layer = new TinySwTabsLayer(engine);

  return layer;
};

export default TinyTabManagerPlugin;
