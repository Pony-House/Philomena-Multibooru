/**
 * Ping/Pong Logic to plugin test.
 *
 * @type {import('../TinyServiceWorkerEngine.mjs').SwPluginInstaller<'SimplePing', '1.0.0', []>}
 */
const TinyPingPwa = (instance) => {
  const engine = instance.engine;
  instance.id = 'SimplePing';
  instance.version = '1.0.0';
  instance.description = 'Ping tester plugin.';
  instance.authors = ['JasminDreasond'];
  instance.contributors = ['JasminDreasond'];

  engine.addMessageListener('ping', ({ reply }) => {
    reply('pong', { msg: 'mio! :3' });
  });
};

export default TinyPingPwa;
