/**
 * Ping/Pong Logic to plugin test.
 *
 * @type {import('../TinyServiceWorkerEngine.mjs').SwPluginInstaller<[]>}
 */
const TinyPingPwa = (instance) => {
  const engine = instance.engine;
  instance.setName('SimplePing');
  instance.setVersion('1.0.0');

  engine.addMessageListener('ping', ({ reply }) => {
    reply('pong', { msg: 'mio! :3' });
  });
};

export default TinyPingPwa;
