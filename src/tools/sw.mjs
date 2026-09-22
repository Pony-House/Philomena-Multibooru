import TinyServiceWorker from 'tiny-essentials/libs/router/TinyServiceWorker';
import TinyTabManagerPlugin from 'tiny-essentials/libs/router/plugins/sw/TabManager';

// Single instance to manage Service Worker
export const swManager = new TinyServiceWorker({
  id: 'web-manager',
  swUrl: '/sw.js',
  version: '1.1.3',
  debugMode: import.meta.env.DEV,
  useLogColors: true,
});

swManager.installPlugin(TinyTabManagerPlugin);

if (import.meta.env.DEV) window.swManager = swManager;
