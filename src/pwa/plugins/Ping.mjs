/**
 * Ping/Pong Logic to plugin test.
 *
 * @type {import('../TinyServiceWorkerEngine.mjs').SwPluginInstaller<[]>}
 */
const TinyPingPwa = (instance) => {
  const engine = instance.engine;
  instance.id = 'SimplePing';
  instance.version = '1.0.0';

  engine.addMessageListener('ping', ({ reply }) => {
    reply('pong', { msg: 'mio! :3' });
  });
};

export default TinyPingPwa;
