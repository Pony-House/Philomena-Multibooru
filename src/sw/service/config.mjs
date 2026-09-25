import TinyServiceWorkerEngine from 'tiny-essentials/libs/sw/service/TinyServiceWorkerEngine';
import RegisterGlobCachePlugin from 'tiny-essentials/libs/sw/service/plugins/GlobCachePlugin';
import ViteFileDetectorPlugin from 'tiny-essentials/libs/sw/service/plugins/ViteFileDetector';
import GlobBypassPlugin from 'tiny-essentials/libs/sw/service/plugins/GlobBypassPlugin';

/** @type {ServiceWorkerGlobalScope} */
// @ts-ignore
export const sw = self;

/** @type {Partial<import('tiny-essentials/libs/sw/service/TinyServiceWorkerEngine').PartialServiceWorkerSettings>} */
const MY_CONFIG = { fetch: { router: { enabled: true } } };
export const tinySw = new TinyServiceWorkerEngine(MY_CONFIG, {
  debugMode: import.meta.env.DEV,
  useLogColors: true,
});

export const logger = tinySw.toConsole();

// Worker files
const workerFiles = ['**/sw.js', '**/worker.js', '**/sw.js?*', '**/worker.js?*'];

// Install plugins
tinySw.installPlugin(ViteFileDetectorPlugin);
tinySw.installPlugin(RegisterGlobCachePlugin, {
  patterns: ['**/*.{js,css,html,ico,jpg,png,svg}'],
  exclude: [...workerFiles, '**/node_modules/**'],
  cacheName: 'static-assets-v1',
});

tinySw.installPlugin(GlobBypassPlugin, {
  patterns: workerFiles,
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
