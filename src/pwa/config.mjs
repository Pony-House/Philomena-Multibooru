import TinyServiceWorkerEngine from './TinyServiceWorkerEngine.mjs';
import RegisterGlobCachePlugin from './plugins/GlobCachePlugin.mjs';
import ViteFileDetectorPlugin from './plugins/ViteFileDetector.mjs';

const { isNavigate } = TinyServiceWorkerEngine;

/** @type {ServiceWorkerGlobalScope} */
// @ts-ignore
export const sw = self;

/** @type {Partial<import('./TinyServiceWorkerEngine.mjs').PartialServiceWorkerSettings>} */
const MY_CONFIG = { fetch: { router: { enabled: true } } };
export const tinySw = new TinyServiceWorkerEngine(MY_CONFIG, {
  debugMode: import.meta.env.DEV,
  useLogColors: true,
});

// Install plugins
tinySw.install(ViteFileDetectorPlugin);
tinySw.install(RegisterGlobCachePlugin, {
  patterns: ['**/*.{js,css,html,ico,jpg,png,svg}'],
  exclude: ['**/sw.js', '**/node_modules/**'],
  cacheName: 'static-assets-v1',
});

// Static routes matching
['/', '/notifications', '/settings', '/search'].forEach((path) =>
  tinySw.addFetchUrlListener(path, (f, r) => {
    // We only intercept navigation requests (HTML)
    if (!isNavigate(f.request)) return;
    if (f.request.mode !== 'navigate') return;
    r.code = 200;
  }),
);

// Dynamic route pattern: /<any.hostname.com>/images/<id> or /<any.hostname.com>/profiles/<id>
// This regex matches a domain-like string in the first segment
tinySw.addFetchRegExpListener(
  '^\\/([a-z0-9.-]+\\.[a-z]{2,})\\/(images|profiles)\\/[^/]+$',
  (f, r) => {
    // We only intercept navigation requests (HTML)
    if (!isNavigate(f.request)) return;
    r.code = 200;
  },
);
