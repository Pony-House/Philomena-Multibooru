import { TinyPluginLayer } from '../TinyPlugin.mjs';
import TinyServiceWorkerEngine from '../TinyServiceWorkerEngine.mjs';

/**
 * Ping/Pong Logic to plugin test.
 *
 * @type {import('../TinyServiceWorkerEngine.mjs').SwPluginInstaller<TinyPluginLayer, 'SimplePing', '1.0.0', []>}
 */
const TinyPingPwa = (instance) => {
  const engine = instance.engine;
  instance.id = 'SimplePing';
  instance.version = '1.0.0';
  instance.description = 'Ping tester plugin.';
  instance.authors = ['JasminDreasond'];
  instance.contributors = ['JasminDreasond'];
  instance.categories = ['dev-tool'];
  instance.tags = ['ping', 'test'];

  if (!(engine instanceof TinyServiceWorkerEngine)) {
    throw new TypeError('Plugin requires a TinyServiceWorkerEngine instance to function.');
  }

  engine.addMessageListener('ping', ({ reply }) => {
    reply('pong', { msg: 'mio! :3' });
  });
  return new TinyPluginLayer()._startLayer();
};

export default TinyPingPwa;
