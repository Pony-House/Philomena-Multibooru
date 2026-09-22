import TinyServiceWorkerEngine from 'tiny-essentials/libs/router/pwa/TinyServiceWorkerEngine';
import RegisterGlobCachePlugin from 'tiny-essentials/libs/router/pwa/plugins/GlobCachePlugin';
import ViteFileDetectorPlugin from 'tiny-essentials/libs/router/pwa/plugins/ViteFileDetector';
import TinyTabManagerPlugin from 'tiny-essentials/libs/router/pwa/plugins/TabManager';

/** @type {ServiceWorkerGlobalScope} */
// @ts-ignore
export const sw = self;

/** @type {Partial<import('tiny-essentials/libs/router/pwa/TinyServiceWorkerEngine').PartialServiceWorkerSettings>} */
const MY_CONFIG = { fetch: { router: { enabled: true } } };
export const tinySw = new TinyServiceWorkerEngine(MY_CONFIG, {
  debugMode: import.meta.env.DEV,
  useLogColors: true,
});

// Install plugins
tinySw.installPlugin(TinyTabManagerPlugin);
tinySw.installPlugin(ViteFileDetectorPlugin);
tinySw.installPlugin(RegisterGlobCachePlugin, {
  patterns: ['**/*.{js,css,html,ico,jpg,png,svg}'],
  exclude: ['**/sw.js', '**/node_modules/**'],
  cacheName: 'static-assets-v1',
});

[
  // Static routes matching
  '/',
  '/notifications',
  '/settings',
  '/search',
  // Dynamic route pattern: /<any.hostname.com>/images/<id> or /<any.hostname.com>/profiles/<id>
  // This regex matches a domain-like string in the first segment
  '/:host/images/:id',
  '/:host/profiles/:id',
].forEach((path) =>
  tinySw.addFetchUrlListener(path, (f, r) => {
    r.code = 200;
  }),
);
