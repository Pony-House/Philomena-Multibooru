import { isJsonObject } from 'tiny-essentials/basics/objChecker';
import { compileGlobRegExp } from 'tiny-essentials/regexp/Glob';
import TinyServiceWorkerEngine from '../TinyServiceWorkerEngine.mjs';
import { TinyPluginLayer } from '../TinyPlugin.mjs';

/**
 * @typedef {Object} GlobCacheOptions
 * @property {string[]} patterns - Array of glob patterns (e.g., ['\*\*\/\*.js', '\*\*\/\*.{css,html}']).
 * @property {string[]} [exclude] - Array of glob patterns to ignore (e.g., ['\*\*\/sw.js']).
 * @property {boolean} [sameOriginOnly=true]
 * @property {string} cacheName - The name of the CacheStorage bucket to use.
 */

/**
 * A plugin for TinyServiceWorkerEngine that implements runtime caching based on glob patterns.
 * @type {import('../TinyServiceWorkerEngine.mjs').SwPluginInstaller<TinyPluginLayer, 'GlobCache', '1.0.0', [GlobCacheOptions]>}
 * @throws {TypeError} If options or patterns are invalid.
 */
const GlobCachePlugin = (instance, options) => {
  const engine = instance.engine;
  instance.id = 'GlobCache';
  instance.version = '1.0.0';
  instance.description = 'The glob cache manager.';
  instance.authors = ['JasminDreasond'];
  instance.contributors = ['JasminDreasond'];

  // 1. Validation
  if (!(engine instanceof TinyServiceWorkerEngine)) {
    throw new TypeError('Plugin requires a TinyServiceWorkerEngine instance to function.');
  }

  if (!isJsonObject(options)) {
    throw new TypeError('[GlobCachePlugin] Options must be a non-null object.');
  }
  if (
    typeof options.sameOriginOnly !== 'undefined' &&
    typeof options.sameOriginOnly !== 'boolean'
  ) {
    throw new TypeError('[GlobCachePlugin] options.sameOriginOnly must be an boolean.');
  }
  if (!Array.isArray(options.patterns) || !options.patterns.every((p) => typeof p === 'string')) {
    throw new TypeError('[GlobCachePlugin] options.patterns must be an array of strings.');
  }
  if (
    typeof options.exclude !== 'undefined' &&
    (!Array.isArray(options.exclude) || !options.exclude.every((p) => typeof p === 'string'))
  ) {
    throw new TypeError('[GlobCachePlugin] options.exclude must be an array of strings.');
  }
  if (typeof options.cacheName !== 'string') {
    throw new TypeError('[GlobCachePlugin] options.cacheName must be a string.');
  }

  const { patterns, exclude, cacheName, sameOriginOnly = true } = options;

  // Pre-compile exclusion patterns into Regex for performance
  const excludeRegexes = (exclude || []).map((pattern) => compileGlobRegExp(pattern));

  // 2. Implementation
  for (const pattern of patterns) {
    const regex = compileGlobRegExp(pattern);
    engine.addFetchRegExpListener(regex.source, async (fetchObj, result) => {
      const { request, url } = fetchObj;
      if (sameOriginOnly && !fetchObj.isSameOrigin) {
        return; // Skip this request
      }

      // Check if the current URL matches any exclusion pattern
      const isExcluded = excludeRegexes.some((re) => re.test(url.pathname));
      if (isExcluded) {
        return; // Skip this request
      }

      try {
        const cache = await caches.open(cacheName);
        const cachedResponse = await cache.match(request);

        if (cachedResponse) {
          // Inject the cached response into the result object
          result.customResponse = cachedResponse;
          return;
        }

        // If not in cache, fetch from network
        const networkResponse = await fetch(request);

        // We must clone the response to add it to the cache,
        // as the body can only be consumed once.
        // Cache API only supports storing GET requests.
        if (networkResponse.status === 200 && request.method === 'GET') {
          cache.put(request, networkResponse.clone());
        }

        result.customResponse = networkResponse;
      } catch (error) {
        // If caching fails, we don't break the flow,
        // we just let the engine proceed to the next plugin or router.
        console.error(`[GlobCachePlugin] Error during cache operation for ${url.pathname}:`, error);
      }
    });
  }

  return new TinyPluginLayer();
};

export default GlobCachePlugin;
