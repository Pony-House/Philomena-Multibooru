/**
 * Configuration options for the ViteFileDetectorPlugin to define which paths should be bypassed.
 * @typedef {Object} ViteFileDetectorOptions
 * @property {(string|RegExp)[]} paths - An array of strings or regular expressions used to identify URLs that should be bypassed.
 * @property {string} srcPath - The base path for the source directory to be included in the bypass list.
 * @property {string} manifestPath - The path to the manifest file to be included in the bypass list.
 */

/**
 * Default configuration to maintain backward compatibility.
 * @type {ViteFileDetectorOptions}
 */
const DEFAULT_OPTIONS = {
  paths: ['/@vite', '/@react', '/node_modules'],
  srcPath: '/src',
  manifestPath: '/manifest.json',
};

/**
 * A plugin for TinyServiceWorkerEngine to detect and bypass Vite-specific files.
 *
 * @type {import('../TinyServiceWorkerEngine.mjs').SwPluginInstaller<'1.0.0', [Partial<ViteFileDetectorOptions>]|[]>}
 * @throws {TypeError} If the engine is invalid or if the provided options do not match the required schema.
 */
const ViteFileDetectorPlugin = (instance, options = {}) => {
  const engine = instance.engine;
  instance.id = 'ViteFileDetector';
  instance.version = '1.0.0';

  // 1. Merge and Validate Options
  /** @type {ViteFileDetectorOptions} */
  const config = { ...DEFAULT_OPTIONS, ...options };

  if (!Array.isArray(config.paths)) {
    throw new TypeError('The "paths" property in options must be an array.');
  }

  const paths = [...config.paths, config.srcPath, config.manifestPath];

  // Deep validation of the paths array elements
  paths.forEach((pattern, index) => {
    const isValidString = typeof pattern === 'string';
    const isValidRegExp = pattern instanceof RegExp;

    if (!isValidString && !isValidRegExp) {
      throw new TypeError(
        `Invalid type at paths[${index}]: Expected string or RegExp, but received ${typeof pattern}.`,
      );
    }
  });

  // 3. Implementation
  if (import.meta.env.DEV) {
    engine.addFetchGlobalListener('ViteFileDetectorPlugin', ({ url }, response) => {
      const isBypassed = paths.some((pattern) => {
        if (pattern instanceof RegExp) return pattern.test(url.pathname);
        return url.pathname.startsWith(pattern);
      });

      if (isBypassed) {
        response.continueCheck = false;
        response.needValidation = false;
        response.code = 200;
      }
    });
  }
};

export default ViteFileDetectorPlugin;
