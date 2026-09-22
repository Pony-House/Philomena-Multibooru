import TinyServiceWorker from 'tiny-essentials/libs/sw/browser/TinyServiceWorker';

// Single instance to manage Service Worker
export const swManager = new TinyServiceWorker({
  id: 'web-manager',
  swUrl: '/sw.js',
  version: '1.1.3',
  debugMode: import.meta.env.DEV,
  useLogColors: true,
});

if (import.meta.env.DEV) window.swManager = swManager;
