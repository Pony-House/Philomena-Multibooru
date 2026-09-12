import { isJsonObject } from 'tiny-essentials/basics/objChecker';
import TinyDebugger from 'tiny-essentials/libs/tools/TinyDebugger';
import TinyVersion from 'tiny-essentials/libs/plugin/TinyVersion';
import { createCheckDestroyed } from 'tiny-essentials/libs/utils/tools';

const checkDestroy = createCheckDestroyed('TinyPlugin');

/**
 * Helper to check if a value matches a set or if the set allows all via '*'
 * @param {string} val - The value to be checked against the set.
 * @param {Set<BlackListValue>| readonly BlackListValue[]} set - The set containing the allowed or blocked values.
 * @returns {boolean} True if the value matches the set or the set contains a wildcard.
 */
const isMatch = (val, set) =>
  set instanceof Set
    ? set.has('*') || set.has(val)
    : set.indexOf('*') > -1 || set.indexOf(val) > -1;

/** @typedef {AlgorithmIdentifier | RsaPssParams | EcdsaParams} CryptoAlgorithm - A valid Web Crypto API algorithm identifier or parameter object. */

/**
 * @typedef {"pkcs8" | "raw" | "spki"} ImportKeyFormat - The format used when importing a cryptographic key.
 */

/**
 * @typedef {Object} PluginIdentity
 * @property {string} id - The unique identifier of the plugin.
 * @property {string[]} authors - The list of authors of the plugin.
 * @property {string[]} categories - The list of categories of the plugin.
 * @property {string[]} tags - The list of tags of the plugin.
 */

/**
 * Signs a plugin's identity using a private key.
 * This function is intended to be used by plugin authors during the build/release process.
 *
 * @param {string} pluginId - The unique identifier of the plugin.
 * @param {string[]} authors - The list of authors of the plugin.
 * @param {string[]} categories - The list of categories the plugin belongs to.
 * @param {string[]} tags - The list of tags the plugin has.
 * @param {CryptoKey} privateKey - The RSA private key used for signing.
 * @param {CryptoAlgorithm} [algorithm] - The cryptographic algorithm to use for signing.
 * @returns {Promise<ArrayBuffer>} A promise that resolves to the digital signature.
 * @throws {TypeError} If the inputs are invalid or the signing process fails.
 */
export async function signPluginIdentity(
  pluginId,
  authors,
  categories,
  tags,
  privateKey,
  algorithm = { name: 'RSASSA-PKCS1-v1_5' },
) {
  // 1. Validate inputs
  if (typeof pluginId !== 'string' || pluginId.length === 0) {
    throw new TypeError('pluginId must be a non-empty string.');
  }
  if (!Array.isArray(authors) || authors.some((a) => typeof a !== 'string')) {
    throw new TypeError('authors must be an array of strings.');
  }
  if (!Array.isArray(categories) || categories.some((c) => typeof c !== 'string')) {
    throw new TypeError('categories must be an array of strings.');
  }
  if (!Array.isArray(tags) || tags.some((t) => typeof t !== 'string')) {
    throw new TypeError('tags must be an array of strings.');
  }
  if (!(privateKey instanceof CryptoKey)) {
    throw new TypeError('privateKey must be a valid CryptoKey instance.');
  }

  // 2. Replicate the identity logic used in TinyPluginCore
  // We sort authors, categories, and tags to ensure the identity is deterministic
  /** @type {PluginIdentity} */
  const identityObject = {
    id: pluginId,
    authors: [...authors].sort(),
    categories: [...categories].sort(),
    tags: [...tags].sort(),
  };
  const identityString = JSON.stringify(identityObject);

  // 3. Encode the identity string to bytes
  const encoder = new TextEncoder();
  const dataBytes = encoder.encode(identityString);

  try {
    // 4. Sign the data using RSASSA-PKCS1-v1_5
    const signature = await crypto.subtle.sign(algorithm, privateKey, dataBytes);
    return signature;
  } catch (error) {
    throw new Error(
      `Failed to sign plugin identity: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Create a deterministic identity string.
 * @param {string} pluginId - The unique identifier of the plugin.
 * @param {string[]} authors - The list of authors of the plugin.
 * @param {string[]} categories - The list of categories of the plugin.
 * @param {string[]} tags - The list of tags of the plugin.
 * @returns {string} The deterministic identity string used for verification.
 */
export const createPluginIdChecker = (pluginId, authors, categories, tags) => {
  if (typeof pluginId !== 'string') {
    throw new TypeError('Security Error: Cryptographic mode enabled, but pluginId is missing.');
  }

  if (!Array.isArray(authors)) {
    throw new TypeError('Security Error: Cryptographic mode enabled, but authors is missing.');
  }
  if (!authors.every((author) => typeof author === 'string')) {
    throw new TypeError('Security Error: Cryptographic mode enabled, but authors is invalid.');
  }

  // We sort authors to ensure the string is identical regardless of input order
  return JSON.stringify({
    id: pluginId,
    authors: [...authors].sort(),
    categories: [...categories].sort(),
    tags: [...tags].sort(),
  });
};

/**
 * @typedef {Object} TinyPluginConstructor - The configuration options.
 * @property {DebuggerConstructor} config.logCfg - The logging configuration.
 * @property {BlackListCorePartial} [sandboxBlacklist] - A list of keys to be blacklisted.
 * @property {PluginAccessControlPartial} [accessControl] - Configuration for identity-based engine access.
 */

/**
 * Configures the access control and sandbox blacklist for the plugin system.
 *
 * @param {Partial<TinyPluginConstructor>} ops - The configuration options for the constructor.
 * @param {PluginAccessControl} accessControl - The access control object to be configured.
 * @param {BlackListCore|null} [sandboxBlacklist] - An optional blacklist for the sandbox.
 */
const pluginConstrctor = (ops, accessControl, sandboxBlacklist) => {
  /**
   * Validates that the provided blacklist values are an array of strings or symbols.
   *
   * @param {string} key - The key to check.
   * @param {BlackListValue[]} values - The values to check.
   */
  const checkBlackList = (key, values) => {
    if (
      !Array.isArray(values) ||
      !values.every((k) => typeof k === 'string' || typeof k === 'symbol')
    ) {
      throw new TypeError(`The ${key} of sandbox blacklist must be an array of strings.`);
    }
  };

  if (isJsonObject(sandboxBlacklist) && isJsonObject(ops?.sandboxBlacklist)) {
    const { get, set } = ops.sandboxBlacklist;
    if (typeof get !== 'undefined') {
      checkBlackList('get', get);
      get.forEach((v) => sandboxBlacklist.get.add(v));
    }
    if (typeof set !== 'undefined') {
      checkBlackList('set', set);
      set.forEach((v) => sandboxBlacklist.set.add(v));
    }
  }

  if (isJsonObject(ops?.accessControl)) {
    const {
      mode,
      whitelist,
      blacklist,
      publicKey,
      cryptoAlgorithm,
      importAlgorithm,
      importKeyFormat,
    } = ops.accessControl;

    if (
      mode !== 'none' &&
      mode !== 'whitelist' &&
      mode !== 'blacklist' &&
      mode !== 'cryptographic'
    ) {
      throw new TypeError(
        'accessControl.mode must be "none", "whitelist", "blacklist", or "cryptographic".',
      );
    }

    if (mode === 'cryptographic') {
      if (typeof publicKey !== 'string') {
        throw new TypeError(
          'In cryptographic mode, accessControl.publicKey must be a string (PEM format).',
        );
      }
    }

    if (isJsonObject(whitelist)) {
      if (typeof whitelist.ids !== 'undefined') {
        checkBlackList('whitelist ids', whitelist.ids);
        whitelist.ids.forEach((id) => accessControl.whitelist.ids.add(id));
      }
      if (typeof whitelist.authors !== 'undefined') {
        checkBlackList('whistlist authors', whitelist.authors);
        whitelist.authors.forEach((id) => accessControl.whitelist.authors.add(id));
      }
      if (typeof whitelist.categories !== 'undefined') {
        checkBlackList('whistlist categories', whitelist.categories);
        whitelist.categories.forEach((id) => accessControl.whitelist.categories.add(id));
      }
      if (typeof whitelist.tags !== 'undefined') {
        checkBlackList('whistlist tags', whitelist.tags);
        whitelist.tags.forEach((id) => accessControl.whitelist.tags.add(id));
      }
    }

    if (isJsonObject(blacklist)) {
      if (typeof blacklist.ids !== 'undefined') {
        checkBlackList('blacklist ids', blacklist.ids);
        blacklist.ids.forEach((id) => accessControl.blacklist.ids.add(id));
      }
      if (typeof blacklist.authors !== 'undefined') {
        checkBlackList('blacklist authors', blacklist.authors);
        blacklist.authors.forEach((id) => accessControl.blacklist.authors.add(id));
      }
      if (typeof blacklist.categories !== 'undefined') {
        checkBlackList('blacklist categories', blacklist.categories);
        blacklist.categories.forEach((id) => accessControl.blacklist.categories.add(id));
      }
      if (typeof blacklist.tags !== 'undefined') {
        checkBlackList('blacklist tags', blacklist.tags);
        blacklist.tags.forEach((id) => accessControl.blacklist.tags.add(id));
      }
    }

    if (typeof mode === 'string') accessControl.mode = mode;
    if (typeof publicKey === 'string') accessControl.publicKey = publicKey;
    if (typeof cryptoAlgorithm !== 'undefined') accessControl.cryptoAlgorithm = cryptoAlgorithm;
    if (typeof importAlgorithm !== 'undefined') accessControl.importAlgorithm = importAlgorithm;
    if (typeof importKeyFormat !== 'undefined') accessControl.importKeyFormat = importKeyFormat;
  }
};

/**
 * Validate asynchronous encryption signature using the native browser API.
 *
 * @param {PluginAccessControl} accessControl - The access control configuration used for verification.
 * @param {Set<string>} verifiedPlugins - The set of plugins that have already been verified.
 * @param {string} pluginId - The unique identifier of the plugin.
 * @param {string[]} authors - The list of authors of the plugin.
 * @param {string[]} categories - The list of categories of the plugin.
 * @param {string[]} tags - The list of tags of the plugin.
 * @param {string} signature - The cryptographic signature provided by the plugin.
 * @returns {Promise<boolean>} A promise that resolves to true if the signature is valid, false otherwise.
 */
export const verifyPluginSignature = async (
  accessControl,
  verifiedPlugins,
  pluginId,
  authors,
  categories,
  tags,
  signature,
) => {
  const { publicKey, cryptoAlgorithm, importKeyFormat, importAlgorithm } = accessControl;
  const identity = createPluginIdChecker(pluginId, authors, categories, tags);

  try {
    if (typeof publicKey !== 'string') {
      throw new TypeError('Security Error: Cryptographic mode enabled, but public key is missing.');
    }
    if (typeof signature !== 'string') {
      throw new TypeError(
        'Security Error: Cryptographic mode enabled, but signature key is missing.',
      );
    }

    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(identity);
    const importedPublicKey = encoder.encode(publicKey);
    const signatureBuffer = encoder.encode(identity);

    const cryptoKey = await crypto.subtle.importKey(
      importKeyFormat,
      importedPublicKey,
      importAlgorithm,
      false,
      ['sign', 'verify'],
    );

    const isValid = await crypto.subtle.verify(
      cryptoAlgorithm,
      cryptoKey,
      signatureBuffer,
      dataBytes,
    );

    if (isValid) verifiedPlugins.add(pluginId);
    return isValid;
  } catch (err) {
    console.error(err);
    return false;
  }
};

/**
 * Determines if a plugin is allowed to access the specified scope based on the current mode.
 *
 * @param {PluginAccessControlMode} mode - The operational mode for engine access control.
 * @param {string} pluginId - The unique identifier of the plugin.
 * @param {readonly string[]} authors - The list of authors of the plugin.
 * @param {readonly string[]} categories - The list of categories of the plugin.
 * @param {readonly string[]} tags - The list of tags of the plugin.
 * @param {BwList|BwListProtected} whitelist - The whitelist configuration.
 * @param {BwList|BwListProtected} blacklist - The blacklist configuration.
 * @param {Set<string>} verifiedPlugins - The set of plugins that have already been verified.
 * @returns {boolean} True if the plugin is allowed, false otherwise.
 */
const isAllowedPlugin = (
  mode,
  pluginId,
  authors,
  categories,
  tags,
  whitelist,
  blacklist,
  verifiedPlugins,
) => {
  // Cryptographic mode: Only plugins that have been successfully verified are returned.
  if (mode === 'cryptographic') {
    return verifiedPlugins.has(pluginId);
  }

  // Whitelist mode: Only plugins whose ID or authors match the whitelist are returned.
  if (mode === 'whitelist') {
    const isIdAllowed = isMatch(pluginId, whitelist.ids);
    const isAuthorAllowed = authors.some((a) => isMatch(a, whitelist.authors));
    const isCategoryAllowed = categories.some((c) => isMatch(c, whitelist.categories));
    const isTagAllowed = tags.some((t) => isMatch(t, whitelist.tags));

    return isIdAllowed || isAuthorAllowed || isCategoryAllowed || isTagAllowed;
  }

  // Blacklist mode: Plugins matching the blacklist (ID or Author) are blocked.
  if (mode === 'blacklist') {
    const isIdBlocked = isMatch(pluginId, blacklist.ids);
    const isAuthorBlocked = authors.some((a) => isMatch(a, blacklist.authors));
    const isCategoryBlocked = categories.some((c) => isMatch(c, blacklist.categories));
    const isTagBlocked = tags.some((t) => isMatch(t, blacklist.tags));

    return !isIdBlocked && !isAuthorBlocked && !isCategoryBlocked && !isTagBlocked;
  }

  return true; // 'none' mode allows everyone
};

/**
 * Creates a default access control object.
 *
 * @returns {PluginAccessControl} A new access control object with default settings.
 */
const createAccessControl = () => ({
  mode: 'none',
  importKeyFormat: 'raw',
  importAlgorithm: { name: 'HMAC', hash: 'sha256' },
  cryptoAlgorithm: { name: 'RSASSA-PKCS1-v1_5' },
  publicKey: null,
  whitelist: { ids: new Set(), authors: new Set(), categories: new Set(), tags: new Set() },
  blacklist: { ids: new Set(), authors: new Set(), categories: new Set(), tags: new Set() },
});

/**
 * Creates a sandboxed proxy to restrict access to the provided instance.
 *
 * @template {TinyPlugin<any, TinyPluginLayer, string, string, any[]>|TinyPluginLayer} InstanceObj - The object to be proxied.
 * @param {InstanceObj} instance - The object to be proxied.
 * @param {BlackListCoreProtected|null} engineSandboxBlacklist - The blacklist from the engine sandbox.
 * @param {BlackListCore|null} sandboxBlacklist - The blacklist for the plugin sandbox.
 * @param {BlackListValue[]} setKeys - The list of keys allowed to be set.
 * @param {BlackListValue[]} getKeys - The list of keys allowed to be accessed.
 * @param {BlackListValue[]} [beGetKeys] - Additional engine keys to be blocked for getting.
 * @param {BlackListValue[]} [beSetKeys] - Additional engine keys to be blocked for setting.
 * @returns {InstanceObj} A proxied version of the instance with restricted access.
 */
const createSandbox = (
  instance,
  engineSandboxBlacklist,
  sandboxBlacklist,
  setKeys,
  getKeys,
  beGetKeys,
  beSetKeys,
) => {
  /** @type {BlackListValue[]} */
  const allowedSetKeys = [...setKeys];

  /** @type {BlackListValue[]} */
  const allowedGetKeys = [...allowedSetKeys, ...getKeys];

  /** @type {BlackListCoreProtected} */
  const coreBlacklist = engineSandboxBlacklist ?? { get: [], set: [] };
  /** @type {BlackListValue[]} */
  const blockedGetKeys = [...(beGetKeys ?? []), ...coreBlacklist.get];

  /** @type {BlackListValue[]} */
  const blockedSetKeys = [...blockedGetKeys, ...coreBlacklist.set, ...(beSetKeys ?? [])];

  if (isJsonObject(sandboxBlacklist)) {
    blockedGetKeys.forEach((key) => sandboxBlacklist.get.add(key));
    blockedSetKeys.forEach((key) => sandboxBlacklist.set.add(key));
  }

  return new Proxy(instance, {
    get(target, prop) {
      if (allowedGetKeys.includes(prop) || allowedGetKeys.includes('*')) {
        const value = Reflect.get(target, prop, target);
        return typeof value === 'function' ? value.bind(target) : value;
      }
      // Prevent access to blocked private/internal methods
      throw new Error(
        `Security Error: Access to property "${String(prop)}" is denied by the sandbox.`,
      );
    },
    set(target, prop, newValue) {
      if (allowedSetKeys.includes(prop) || allowedSetKeys.includes('*')) {
        return Reflect.set(target, prop, newValue);
      }
      // Prevent the plugin from modifying blocked properties on the sandbox
      throw new Error('Security Error: Cannot modify read-only properties on the plugin sandbox.');
    },
    // Ensure the prototype is protected
    setPrototypeOf() {
      throw new Error('Security Error: Prototype manipulation is forbidden.');
    },
  });
};

/** @typedef {import('tiny-essentials/libs/tools/TinyDebugger').DebuggerConstructor} DebuggerConstructor - The constructor function for a debugger instance. */

/**
 * @typedef {Object} LayerSecurityConfig
 * @property {PluginAccessControl} accessControl - The access control configuration for the layer.
 * @property {BlackListCorePartial} [sandboxBlacklist] - Configuration for the layer's sandbox.
 */

/**
 * Represents the isolated runtime environment or state container for a plugin.
 * It manages the 'ready' state and provides a secondary security layer
 * mirroring the TinyPluginCore security ecosystem.
 */
class TinyPluginLayer extends TinyDebugger {
  #isReady = false;
  /** @type {Set<string>} */
  #verifiedPlugins = new Set();

  /** @type {PluginAccessControl} */
  #accessControl = createAccessControl();

  /**
   * Gets whether the layer is initialized and ready.
   * @returns {boolean} True if the layer is ready, false otherwise.
   */
  get isReady() {
    return this.#isReady;
  }

  /**
   * Gets the current layer access control whitelist.
   * @returns {BwListProtected} The current layer access control whitelist.
   */
  get accessControlWhitelist() {
    return Object.freeze({
      ids: Object.freeze([...this.#accessControl.whitelist.ids]),
      authors: Object.freeze([...this.#accessControl.whitelist.authors]),
      categories: Object.freeze([...this.#accessControl.whitelist.categories]),
      tags: Object.freeze([...this.#accessControl.whitelist.tags]),
    });
  }

  /**
   * Gets the current layer access control blacklist.
   * @returns {BwListProtected} The current layer access control blacklist.
   */
  get accessControlBlacklist() {
    return Object.freeze({
      ids: Object.freeze([...this.#accessControl.blacklist.ids]),
      authors: Object.freeze([...this.#accessControl.blacklist.authors]),
      categories: Object.freeze([...this.#accessControl.blacklist.categories]),
      tags: Object.freeze([...this.#accessControl.blacklist.tags]),
    });
  }

  /**
   * Gets the current layer access control mode.
   * @returns {PluginAccessControlMode} The current layer access control mode.
   */
  get accessControlMode() {
    return this.#accessControl.mode;
  }

  /**
   * Initializes a new instance of the TinyPluginLayer class.
   * @param {TinyPluginConstructor} [ops] - The configuration options for the constructor.
   */
  constructor(ops) {
    super(
      ops?.logCfg ?? {
        id: '[_blue_TinyPluginLayer_reset_]',
        logger: console,
        debugMode: false,
        useLogColors: false,
      },
    );
    pluginConstrctor(ops ?? {}, this.#accessControl);
  }

  /**
   * Internal method to initialize the layer state.
   * @template {any[]} Args - The type of arguments passed to the callback.
   * @param {(...args: Args) => void} [callback] - An optional callback function to execute during initialization.
   * @param {Args} args - The arguments to be passed to the callback.
   * @returns {this} The current instance of the TinyPluginLayer.
   * @throws {Error} If the layer has already been initialized.
   */
  _startLayer(callback, ...args) {
    if (this.#isReady) {
      throw new Error('TinyPluginLayer: The layer has already been initialized.');
    }
    if (typeof callback === 'function') callback(...args);
    this.#isReady = true;
    return this;
  }

  /**
   * Validates if a plugin is permitted to access the layer based on identity.
   * @param {string} pluginId - The unique identifier of the plugin.
   * @param {readonly string[]} authors - The list of authors of the plugin.
   * @param {readonly string[]} categories - The list of categories of the plugin.
   * @param {readonly string[]} tags - The list of tags of the plugin.
   * @returns {boolean} True if access is granted, false otherwise.
   */
  canAccessLayer(pluginId, authors, categories, tags) {
    const { mode, whitelist, blacklist } = this.#accessControl;
    return isAllowedPlugin(
      mode,
      pluginId,
      authors,
      categories,
      tags,
      whitelist,
      blacklist,
      this.#verifiedPlugins,
    );
  }

  /**
   * Validates an asynchronous signature for the layer's scope.
   * @param {string} pluginId - The unique identifier.
   * @param {string[]} authors - The authors list.
   * @param {string[]} categories - The categories list.
   * @param {string[]} tags - The tags list.
   * @param {string} signature - The cryptographic signature.
   * @returns {Promise<boolean>} A promise that resolves to true if the signature is valid, false otherwise.
   */
  async verifyPluginSignature(pluginId, authors, categories, tags, signature) {
    return verifyPluginSignature(
      this.#accessControl,
      this.#verifiedPlugins,
      pluginId,
      authors,
      categories,
      tags,
      signature,
    );
  }

  /**
   * Creates a secure proxy to restrict plugin access to the host.
   * This ensures that even if the layer is passed to external entities,
   * its internal state and lifecycle methods remain protected.
   * @returns {this} The proxied instance of the layer.
   */
  _createSandbox() {
    return createSandbox(
      this,
      null,
      null,
      // Allowed set keys.
      [],
      // Allowed get keys.
      [
        'isReady',
        'accessControlMode',
        'accessControlWhitelist',
        'accessControlBlacklist',
        'verifyPluginSignature',
        'canAccessLayer',
      ],
    );
  }
}

/** @typedef {string|symbol} BlackListValue - The type of value that can be stored in a blacklist (either a string or a symbol). */

/**
 * @typedef {Object} BlackListCore
 * @property {Set<BlackListValue>} get - The set of restricted keys for getting.
 * @property {Set<BlackListValue>} set - The set of restricted keys for setting.
 */

/**
 * @typedef {Object} BlackListCorePartial
 * @property {BlackListValue[]} [get] - A list of restricted keys for getting.
 * @property {BlackListValue[]} [set] - A list of restricted keys for setting.
 */

/**
 * @typedef {Object} BlackListCoreProtected
 * @property {Readonly<BlackListValue[]>} get - A read-only array of restricted keys for getting.
 * @property {Readonly<BlackListValue[]>} set - A read-only array of restricted keys for setting.
 */

/**
 * @typedef {Object} BwList
 * @property {Set<BlackListValue>} ids - A set of restricted plugin IDs.
 * @property {Set<BlackListValue>} authors - A set of restricted author names.
 * @property {Set<BlackListValue>} categories - A set of restricted plugin categories.
 * @property {Set<BlackListValue>} tags - A set of restricted plugin tags.
 */

/**
 * @typedef {Object} BwListArray
 * @property {BlackListValue[]} ids - An array of restricted plugin IDs.
 * @property {BlackListValue[]} authors - An array of restricted author names.
 * @property {BlackListValue[]} categories - An array of restricted plugin categories.
 * @property {BlackListValue[]} tags - An array of restricted plugin tags.
 */

/**
 * @typedef {Object} BwListProtected
 * @property {Readonly<BlackListValue[]>} ids - A read-only array of restricted plugin IDs.
 * @property {Readonly<BlackListValue[]>} authors - A read-only array of restricted author names.
 * @property {Readonly<BlackListValue[]>} categories - A read-only array of restricted plugin categories.
 * @property {Readonly<BlackListValue[]>} tags - A read-only array of restricted plugin tags.
 */

/**
 * The operational mode for engine access control.
 * @typedef {'none' | 'whitelist' | 'blacklist' | 'cryptographic'} PluginAccessControlMode
 */

/**
 * @typedef {Object} PluginAccessControlPartial
 * @property {PluginAccessControlMode} mode - The operational mode for engine access control.
 * @property {BwListArray} [whitelist] - The whitelist configuration.
 * @property {BwListArray} [blacklist] - The blacklist configuration.
 * @property {string} [publicKey] - The public key used for cryptographic verification.
 * @property {CryptoAlgorithm} [cryptoAlgorithm] - The algorithm used for signature verification.
 * @property {CryptoAlgorithm} [importAlgorithm] - The algorithm used for importing the public key.
 * @property {ImportKeyFormat} [importKeyFormat] - The format of the key being imported.
 */

/**
 * @typedef {Object} PluginAccessControl
 * @property {PluginAccessControlMode} mode - The operational mode for engine access control.
 * @property {BwList} whitelist - The whitelist configuration.
 * @property {BwList} blacklist - The blacklist configuration.
 * @property {string|null} publicKey - The public key used for cryptographic verification.
 * @property {CryptoAlgorithm} cryptoAlgorithm - The algorithm used for signature verification.
 * @property {CryptoAlgorithm} importAlgorithm - The algorithm used for importing the public key.
 * @property {ImportKeyFormat} importKeyFormat - The format of the key being imported.
 */

/**
 * The core engine class responsible for managing the plugin lifecycle and registry.
 * It extends TinyDebugger to provide debugging capabilities alongside plugin management.
 */
class TinyPluginCore extends TinyDebugger {
  static #pluginsDestroyEventName = 'pluginsDestroyed';
  /** @type {BlackListCore} */
  #sandboxBlacklist = { get: new Set(), set: new Set() };

  /** @type {PluginAccessControl} */
  #accessControl = createAccessControl();

  /** @type {Set<string>} */
  #verifiedPlugins = new Set();

  /**
   * Gets the event name used when all plugins are destroyed.
   * @returns {string} The event name.
   */
  static get pluginsDestroyEventName() {
    return TinyPluginCore.pluginsDestroyEventName;
  }

  /**
   * Sets the event name used when all plugins are destroyed.
   * @param {string} value - The new event name.
   * @throws {TypeError} If the value is not a string.
   */
  static set pluginsDestroyEventName(value) {
    if (typeof value !== 'string') throw new TypeError('pluginsDestroyEventName must be a string.');
    TinyPluginCore.pluginsDestroyEventName = value;
  }

  /** @type {Map<string, TinyPlugin<this, TinyPluginLayer, string, string, any[]>>} A map of registered plugins. */
  #plugins = new Map();

  /**
   * Gets the blacklist of restricted keys for the engine.
   * @returns {BlackListCoreProtected} A read-only array of restricted keys.
   */
  get sandboxBlacklist() {
    return Object.freeze({
      set: Object.freeze([...this.#sandboxBlacklist.set]),
      get: Object.freeze([...this.#sandboxBlacklist.get]),
    });
  }

  /**
   * Returns a plain object representation of the registered plugins.
   * This converts the internal Map into a standard object, providing a snapshot
   * of the plugins for easier external access.
   * @returns {Record<string, TinyPlugin<this, TinyPluginLayer, string, string, any[]>>} An object where keys are plugin names and values are the plugin instances.
   */
  get plugins() {
    return Object.fromEntries(this.#plugins);
  }

  /**
   * Gets the total number of registered plugins in the engine.
   * @returns {number} The total number of registered plugins in the engine.
   */
  get pluginsSize() {
    return this.#plugins.size;
  }

  /**
   * Gets the current engine access control whitelist.
   * @returns {BwListProtected} The current engine access control whitelist.
   */
  get accessControlWhitelist() {
    return Object.freeze({
      ids: Object.freeze([...this.#accessControl.whitelist.ids]),
      authors: Object.freeze([...this.#accessControl.whitelist.authors]),
      categories: Object.freeze([...this.#accessControl.whitelist.categories]),
      tags: Object.freeze([...this.#accessControl.whitelist.tags]),
    });
  }

  /**
   * Gets the current engine access control blacklist.
   * @returns {BwListProtected} The current engine access control blacklist.
   */
  get accessControlBlacklist() {
    return Object.freeze({
      ids: Object.freeze([...this.#accessControl.blacklist.ids]),
      authors: Object.freeze([...this.#accessControl.blacklist.authors]),
      categories: Object.freeze([...this.#accessControl.blacklist.categories]),
      tags: Object.freeze([...this.#accessControl.blacklist.tags]),
    });
  }

  /**
   * Gets the current engine access control mode.
   * @returns {PluginAccessControlMode} The current engine access control mode.
   */
  get accessControlMode() {
    return this.#accessControl.mode;
  }

  /**
   * Initializes a new instance of the TinyPluginCore class.
   * @param {TinyPluginConstructor} ops - The configuration options.
   */
  constructor(ops) {
    super(ops.logCfg);
    pluginConstrctor(ops, this.#accessControl, this.#sandboxBlacklist);
  }

  /**
   * Validates if a plugin is permitted to access the engine's properties based on identity.
   * @param {string} pluginId - The unique identifier of the plugin.
   * @param {readonly string[]} authors - The list of authors of the plugin.
   * @param {readonly string[]} categories - The list of categories of the plugin.
   * @param {readonly string[]} tags - The list of tags of the plugin.
   * @returns {boolean} True if access is granted, false otherwise.
   */
  canAccessEngine(pluginId, authors, categories, tags) {
    const { mode, whitelist, blacklist } = this.#accessControl;
    return isAllowedPlugin(
      mode,
      pluginId,
      authors,
      categories,
      tags,
      whitelist,
      blacklist,
      this.#verifiedPlugins,
    );
  }

  /**
   * Validate asynchronous encryption signature using the native browser API.
   * @param {string} pluginId - The unique identifier of the plugin.
   * @param {string[]} authors - The list of authors of the plugin.
   * @param {string[]} categories - The list of categories of the plugin.
   * @param {string[]} tags - The list of tags of the plugin.
   * @param {string} signature - The cryptographic signature.
   * @returns {Promise<boolean>} A promise that resolves to true if the signature is valid, false otherwise.
   */
  async verifyPluginSignature(pluginId, authors, categories, tags, signature) {
    return verifyPluginSignature(
      this.#accessControl,
      this.#verifiedPlugins,
      pluginId,
      authors,
      categories,
      tags,
      signature,
    );
  }

  /**
   * Registers a plugin instance into the engine's internal plugin registry.
   *
   * @param {TinyPlugin<this, TinyPluginLayer, string, string, any[]>} plugin - The plugin instance to be registered.
   * @throws {TypeError} If the provided plugin is not an instance of TinyPlugin.
   * @throws {Error} If the plugin is denied access to the core based on current access control rules.
   */
  _addPlugin(plugin) {
    if (!(plugin instanceof TinyPlugin))
      throw new TypeError('The provided plugin must be an instance of TinyPlugin.');
    if (!this.canAccessEngine(plugin.id, plugin.authors, plugin.categories, plugin.tags)) {
      throw new Error(
        `Security Error: Access to the core is denied for plugin "${plugin.id}" based on current access control rules.`,
      );
    }
    this.#plugins.set(plugin.id, plugin);
  }

  /**
   * Installs a new plugin into the engine and starts its lifecycle.
   *
   * @template {TinyPluginLayer} Layer - The type of the plugin layer.
   * @template {string} Id - The type of the plugin ID.
   * @template {string} Version - The type of the plugin version.
   * @template {any[]} Options - The type of the configuration options.
   * @param {TinyPluginInstaller<this, Layer, Id, Version, Options>} plugin - The plugin instance to be registered.
   * @param {Options} options - Configuration options for the plugin.
   * @returns {TinyPlugin<this, Layer, Id, Version, Options>} The newly installed plugin instance.
   */
  installPlugin(plugin, ...options) {
    return TinyPlugin._addModuleToCore(this, plugin, ...options);
  }

  /**
   * Checks if a specific plugin is already registered in the engine's internal registry.
   * @param {TinyPlugin<this, TinyPluginLayer, string, string, any[]>|string} plugin - The plugin instance or ID to check.
   * @returns {boolean} True if the plugin is registered, false otherwise.
   */
  hasPlugin(plugin) {
    return this.#plugins.has(typeof plugin === 'string' ? plugin : plugin.id);
  }

  /**
   * Retrieves a plugin instance by its unique identifier.
   * @param {string} key - The unique identifier of the plugin.
   * @returns {TinyPlugin<this, TinyPluginLayer, string, string, any[]>|undefined} The plugin instance if found, otherwise undefined.
   */
  getPlugin(key) {
    const plugin = this.#plugins.get(key);
    return plugin && !plugin.isDestroyed ? plugin : undefined;
  }

  /**
   * Retrieves a plugin instance by its unique identifier with security enforcement.
   * This method checks the target plugin's identity against the engine's
   * access control rules (whitelist/blacklist/cryptographic).
   *
   * @template {any} ExternalPlugin - The external plugin trying to get the target plugin.
   * @param {string} targetId - The unique identifier of the target plugin.
   * @param {ExternalPlugin} externalPlugin - The external plugin trying to get the target plugin.
   * @returns {TinyPlugin<this, TinyPluginLayer, string, string, any[]>|undefined} The plugin instance if access is granted, otherwise undefined.
   */
  _getPlugin(targetId, externalPlugin) {
    if (!(externalPlugin instanceof TinyPlugin))
      throw new TypeError('The provided external plugin must be an instance of TinyPlugin.');
    const plugin = this.#plugins.get(targetId);

    // If the plugin doesn't exist or has been destroyed, it is not available.
    if (!plugin || plugin.isDestroyed) {
      return undefined;
    }

    if (
      !plugin.layer.canAccessLayer(
        externalPlugin.id,
        externalPlugin.authors,
        externalPlugin.categories,
        externalPlugin.tags,
      )
    ) {
      throw new Error(
        `Security Error: Access to the plugin "${targetId}" is denied for plugin "${externalPlugin.id}" based on current plugin access control rules.`,
      );
    }

    return plugin;
  }

  /**
   * Destroys all registered plugins and emits the destruction event.
   */
  destroyPlugins() {
    this.#verifiedPlugins.clear();
    this.#plugins.forEach((plugin) => plugin.destroy());
    this.emit(TinyPluginCore.#pluginsDestroyEventName);
  }
}

/**
 * A function used to install a plugin into the engine.
 * This function is responsible for the actual initialization logic of the plugin,
 * setting up its layer and validating its configuration.
 *
 * @template {TinyPluginCore} Engine - The type of the engine instance.
 * @template {TinyPluginLayer} Layer - The type of the layer returned by the installer.
 * @template {string} IdString - The type of the plugin's unique identifier.
 * @template {string} VersionString - The type of the plugin's version.
 * @template {any[]} Options - The type of the plugin's configuration options.
 *
 * @typedef { (plugin: TinyPlugin<Engine, Layer, IdString, VersionString, Options>, ...options: Options) => Layer } TinyPluginInstaller - The plugin instance being initialized.
 */

/**
 * Represents a plugin instance designed to be integrated into a main engine.
 * It encapsulates the plugin's identity (id and version), its connection to the engine,
 * its installation logic, and any associated configuration options.
 *
 * @template {TinyPluginCore} Engine - The type of the engine.
 * @template {TinyPluginLayer} Layer - The type of the plugin layer.
 * @template {string} IdString - The type of the plugin's unique identifier.
 * @template {string} VersionString - The type of the plugin's version.
 * @template {any[]} Options - The type of the plugin's configuration options.
 */
class TinyPlugin extends TinyDebugger {
  /** @type {DebuggerConstructor} */
  static #logCfg = {
    id: '[_blue_TinyPlugin_reset_]',
    logger: console,
    debugMode: false,
    canEmitLogs: false,
    useLogColors: true,
  };

  /**
   * Gets the logging configuration for the TinyPlugin class.
   * @returns {DebuggerConstructor} The logging configuration constructor.
   */
  static get logCfg() {
    return { ...TinyPlugin.#logCfg };
  }

  /**
   * Sets the logging configuration for the TinyPlugin class.
   * @param {DebuggerConstructor} value - The new logging configuration.
   */
  static set logCfg(value) {
    this.#logCfg = value;
  }

  /**
   * Installs a new plugin into a engine and starts its lifecycle.
   * @template {TinyPluginCore} ExternalEngine - The type of the engine.
   * @template {TinyPluginLayer} ExternalLayer - The type of the plugin layer.
   * @template {string} ExternalIdString - The type of the plugin ID.
   * @template {string} ExternalVersionString - The type of the plugin version.
   * @template {any[]} ExternalOptions - The type of the plugin's configuration options.
   * @param {ExternalEngine} engine - The main instance connected to plugin.
   * @param {TinyPluginInstaller<ExternalEngine, ExternalLayer, ExternalIdString, ExternalVersionString, ExternalOptions>} plugin - The plugin instance to be registered.
   * @param {ExternalOptions} options - Configuration options for the plugin.
   * @returns {TinyPlugin<ExternalEngine, ExternalLayer, ExternalIdString, ExternalVersionString, ExternalOptions>} - The plugin instance.
   * @throws {TypeError} If the provided engine is not an instance of TinyPluginCore.
   */
  static _addModuleToCore(engine, plugin, ...options) {
    if (!(engine instanceof TinyPluginCore))
      throw new TypeError('The provided engine must be an instance of TinyPluginCore.');
    /** @type {TinyPlugin<ExternalEngine, ExternalLayer, ExternalIdString, ExternalVersionString, ExternalOptions>} */
    const instance = new TinyPlugin(
      { engine: engine, installer: plugin, logCfg: { ...TinyPlugin.#logCfg } },
      ...options,
    );
    instance._startPlugin();
    // @ts-ignore
    if (engine.hasPlugin(instance))
      throw new Error(`A plugin with the name "${instance.id}" is already registered.`);
    // @ts-ignore
    engine._addPlugin(instance);
    return instance;
  }

  /** @type {BlackListCore} */
  #sandboxBlacklist = { get: new Set(), set: new Set() };
  /** @type {IdString} The unique id of the plugin. */
  // @ts-ignore
  #id = '';
  /** @type {string} The description of the plugin. */
  #description = '';
  /** @type {Set<string>} The list of authors of the plugin. */
  #authors = new Set();
  /** @type {Set<string>} The list of contributors to the plugin. */
  #contributors = new Set();
  /** @type {Set<string>} The categories of the plugin. */
  #categories = new Set();
  /** @type {Set<string>} The tags of the plugin. */
  #tags = new Set();
  /** @type {TinyVersion<VersionString>|null} The version string of the plugin. */
  #version = null;
  /** @type {Engine} The engine instance this plugin is attached to. */
  #engine;
  /** @type {TinyPluginInstaller<Engine, Layer, IdString, VersionString, Options>} The installer function used to initialize the plugin. */
  #installer;
  /** @type {Options} An array of configuration options provided to the plugin. */
  #options;
  /** @type {boolean} Indicates whether the plugin has already been started and is ready. */
  #isReady = false;
  /** @type {Layer|null} */
  #layer = null;
  /** @type {boolean} */
  #isDestroyed = false;

  /**
   * Gets whether the plugin has been destroyed.
   * @returns {boolean} True if the plugin has been destroyed, false otherwise.
   */
  get isDestroyed() {
    return this.#isDestroyed;
  }

  /**
   * Gets the plugin's layer instance.
   * @returns {Layer} The proxied plugin layer.
   */
  get layer() {
    checkDestroy(this.#isDestroyed);
    if (this.#layer === null) throw new Error('Plugin layer is not set.');
    return this.#layer._createSandbox();
  }

  /**
   * Gets the plugins object from the engine.
   * @returns {string[]} The plugins object from the engine.
   */
  get plugins() {
    checkDestroy(this.#isDestroyed);
    return Object.keys(this.#engine.plugins);
  }

  /**
   * Gets the total number of plugins in the engine.
   * @returns {number} The total number of plugins in the engine.
   */
  get pluginsSize() {
    checkDestroy(this.#isDestroyed);
    return this.#engine.pluginsSize;
  }

  /**
   * Retrieves the plugin instance associated with the given ID from the engine.
   * @param {string} id - The unique identifier of the plugin.
   * @returns {TinyPlugin<Engine, TinyPluginLayer, string, string, any[]>|undefined} The plugin instance if found, otherwise undefined.
   */
  getPlugin(id) {
    checkDestroy(this.#isDestroyed);
    return this.#engine._getPlugin(id, this);
  }

  /**
   * Checks if the specified plugin or ID is registered in the engine.
   * @param {TinyPlugin<Engine, TinyPluginLayer, string, string, any[]>|string} plugin - The plugin instance or ID to check.
   * @returns {boolean} True if the plugin is registered, false otherwise.
   */
  hasPlugin(plugin) {
    checkDestroy(this.#isDestroyed);
    return this.#engine.hasPlugin(plugin);
  }

  /**
   * Gets the readiness status of the plugin.
   * @returns {boolean} True if the plugin is ready, false otherwise.
   */
  get isReady() {
    checkDestroy(this.#isDestroyed);
    return this.#isReady;
  }

  /**
   * Gets the unique identifier of the plugin.
   * @returns {IdString} The plugin id.
   */
  get id() {
    checkDestroy(this.#isDestroyed);
    if (this.#id.length === 0) throw new Error('Plugin id is not set.');
    return this.#id;
  }

  /**
   * Sets the unique identifier for the plugin.
   * @param {IdString} value - The new unique identifier for the plugin.
   * @throws {Error} If the id is already set.
   * @throws {TypeError} If the value is not a string or is empty.
   */
  set id(value) {
    checkDestroy(this.#isDestroyed);
    if (this.#id.length !== 0) throw new Error('Id is already set.');
    if (typeof value !== 'string') throw new TypeError('Id must be a string.');
    if (value.length === 0) throw new TypeError('Id cannot be empty.');
    this.#id = value;
  }

  /**
   * Gets the description of the plugin.
   * @returns {string} The plugin description.
   */
  get description() {
    checkDestroy(this.#isDestroyed);
    if (this.#description.length === 0) throw new Error('Plugin description is not set.');
    return this.#description;
  }

  /**
   * Sets the description for the plugin.
   * @param {string} value - The new description for the plugin.
   * @throws {Error} If the description is already set.
   * @throws {TypeError} If the value is not a string or is empty.
   */
  set description(value) {
    checkDestroy(this.#isDestroyed);
    if (this.#description.length !== 0) throw new Error('Description is already set.');
    if (typeof value !== 'string') throw new TypeError('Description must be a string.');
    if (value.length === 0) throw new TypeError('Description cannot be empty.');
    this.#description = value;
  }

  /**
   * Gets the list of authors for the plugin.
   * @returns {readonly string[]} The plugin authors.
   * @throws {Error} If the plugin authors are not set.
   */
  get authors() {
    checkDestroy(this.#isDestroyed);
    if (this.#authors.size === 0) throw new Error('Plugin authors is not set.');
    return Object.freeze([...this.#authors]);
  }

  /**
   * Sets the list of authors for the plugin.
   * @param {string[]} value - The new list of authors for the plugin.
   * @throws {Error} If the authors are already set.
   * @throws {TypeError} If the value is not an array of non-empty strings or is empty.
   */
  set authors(value) {
    checkDestroy(this.#isDestroyed);
    if (this.#authors.size !== 0) throw new Error('Authors is already set.');
    if (
      !Array.isArray(value) ||
      !value.every((v) => typeof v === 'string' && v.trim().length !== 0)
    )
      throw new TypeError('Authors must be a array of non-empty strings.');
    if (value.length === 0) throw new TypeError('Authors cannot be empty.');
    value.forEach((v) => this.#authors.add(v));
  }

  /**
   * Gets the list of contributors to the plugin.
   * @returns {readonly string[]} The plugin contributors.
   * @throws {Error} If the plugin contributors are not set.
   */
  get contributors() {
    checkDestroy(this.#isDestroyed);
    if (this.#contributors.size === 0) throw new Error('Plugin contributors is not set.');
    return Object.freeze([...this.#contributors]);
  }

  /**
   * Sets the list of contributors for the plugin.
   * @param {string[]} value - The new list of contributors for the plugin.
   * @throws {Error} If the contributors are already set.
   * @throws {TypeError} If the value is not an array of non-empty strings or is empty.
   */
  set contributors(value) {
    checkDestroy(this.#isDestroyed);
    if (this.#contributors.size !== 0) throw new Error('Authors is already set.');
    if (
      !Array.isArray(value) ||
      !value.every((v) => typeof v === 'string' && v.trim().length !== 0)
    )
      throw new TypeError('Authors must be a array of non-empty strings.');
    if (value.length === 0) throw new TypeError('Authors cannot be empty.');
    value.forEach((v) => this.#contributors.add(v));
  }

  /**
   * Gets the categories of the plugin.
   * @returns {readonly string[]} The plugin categories.
   * @throws {Error} If the plugin categories are not set.
   */
  get categories() {
    checkDestroy(this.#isDestroyed);
    if (this.#categories.size === 0) throw new Error('Plugin categories are not set.');
    return Object.freeze([...this.#categories]);
  }

  /**
   * Sets the categories for the plugin.
   * @param {string[]} value - The new list of the plugin categories.
   * @throws {Error} If the categories are already set.
   * @throws {TypeError} If the value is not an array of non-empty strings or is empty.
   */
  set categories(value) {
    checkDestroy(this.#isDestroyed);
    if (this.#categories.size !== 0) throw new Error('Categories are already set.');
    if (
      !Array.isArray(value) ||
      !value.every((v) => typeof v === 'string' && v.trim().length !== 0)
    )
      throw new TypeError('Categories must be an array of non-empty strings.');
    if (value.length === 0) throw new TypeError('Categories cannot be empty.');
    value.forEach((v) => this.#categories.add(v));
  }

  /**
   * Gets the tags of the plugin.
   * @returns {readonly string[]} The plugin tags.
   * @throws {Error} If the plugin tags are not set.
   */
  get tags() {
    checkDestroy(this.#isDestroyed);
    if (this.#tags.size === 0) throw new Error('Plugin tags are not set.');
    return Object.freeze([...this.#tags]);
  }

  /**
   * Sets the tags for the plugin.
   * @param {string[]} value - The new list of the plugin tags.
   * @throws {Error} If the tags are already set.
   * @throws {TypeError} If the value is not an array of non-empty strings or is empty.
   */
  set tags(value) {
    checkDestroy(this.#isDestroyed);
    if (this.#tags.size !== 0) throw new Error('Tags are already set.');
    if (
      !Array.isArray(value) ||
      !value.every((v) => typeof v === 'string' && v.trim().length !== 0)
    )
      throw new TypeError('Tags must be an array of non-empty strings.');
    if (value.length === 0) throw new TypeError('Tags cannot be empty.');
    value.forEach((v) => this.#tags.add(v));
  }

  /**
   * Gets the version of the plugin as a string.
   * @returns {VersionString} The plugin version.
   * @throws {Error} If the plugin version is not set.
   */
  get version() {
    checkDestroy(this.#isDestroyed);
    if (!this.#version) throw new Error('Plugin version is not set.');
    return this.#version.toString();
  }

  /**
   * Sets the version of the plugin.
   * @param {VersionString} value - The new version string for the plugin.
   * @throws {Error} If the version is already set.
   * @throws {TypeError} If the value is not a string or is empty.
   */
  set version(value) {
    checkDestroy(this.#isDestroyed);
    if (this.#version) throw new Error('Version is already set.');
    if (typeof value !== 'string') throw new TypeError('Version must be a string.');
    if (value.length === 0) throw new TypeError('Version cannot be empty.');
    this.#version = new TinyVersion(value);
  }

  /**
   * Retrieves the current version of the plugin as a TinyVersion instance.
   * @returns {TinyVersion<VersionString>} The TinyVersion instance representing the plugin's version.
   * @throws {Error} If the plugin version is not set.
   */
  get tinyVersion() {
    checkDestroy(this.#isDestroyed);
    if (!this.#version) throw new Error('Plugin version is not set.');
    return this.#version;
  }

  /**
   * Gets the engine instance associated with this plugin.
   * The engine is proxied to prevent unauthorized access to internal methods.
   * @returns {Engine} The engine instance.
   * @throws {Error} If the plugin is denied access to the engine by the access control rules.
   */
  get engine() {
    checkDestroy(this.#isDestroyed);

    // Identity-based security check
    if (
      !this.#engine.canAccessEngine(
        this.#id,
        [...this.#authors],
        [...this.#categories],
        [...this.#tags],
      )
    ) {
      throw new Error(
        `Security Error: Access to the engine is denied for plugin "${this.id}" based on current access control rules.`,
      );
    }

    const sandboxBlacklist = this.#sandboxBlacklist;
    return new Proxy(this.#engine, {
      get(target, prop) {
        if (sandboxBlacklist.get.has(prop)) {
          // Prevent access to blocked private/internal methods
          throw new Error(
            `Security Error: Access to property "${String(prop)}" is denied by the sandbox.`,
          );
        }
        const value = Reflect.get(target, prop, target);
        return typeof value === 'function' ? value.bind(target) : value;
      },
      set(target, prop, newValue) {
        if (sandboxBlacklist.set.has(prop)) {
          // Prevent the plugin from modifying blocked properties on the sandbox
          throw new Error(
            'Security Error: Cannot modify read-only properties on the plugin sandbox.',
          );
        }
        return Reflect.set(target, prop, newValue);
      },
      // Ensure the prototype is protected
      setPrototypeOf() {
        throw new Error('Security Error: Prototype manipulation is forbidden.');
      },
    });
  }

  /**
   * Gets the configuration options of the plugin.
   * @returns {Options} The configuration options of the plugin.
   */
  get options() {
    checkDestroy(this.#isDestroyed);
    return this.#options;
  }

  /**
   * Gets the blacklist of restricted keys from the engine.
   * This is accessible within the plugin's sandbox for inspection.
   * @returns {BlackListCoreProtected} The blacklist from the engine.
   */
  get engineBlacklist() {
    checkDestroy(this.#isDestroyed);
    return this.#engine.sandboxBlacklist;
  }

  /**
   * Initializes a new instance of TinyPlugin.
   * @param {Object} config - The configuration object.
   * @param {Engine} config.engine - The engine instance.
   * @param {DebuggerConstructor} config.logCfg - The logging configuration.
   * @param {TinyPluginInstaller<Engine, Layer, IdString, VersionString, Options>} config.installer - The installer function.
   * @param {Options} ops - Additional configuration options.
   */
  constructor({ engine, logCfg, installer }, ...ops) {
    super(logCfg);
    this.#engine = engine;
    this.#installer = installer;
    this.#options = ops;
  }

  /**
   * Creates a secure proxy to restrict plugin access to the host.
   * This prevents the plugin from accessing the 'engine' or mutating the plugin instance.
   */
  #createSandbox() {
    return createSandbox(
      this,
      this.#engine.sandboxBlacklist,
      this.#sandboxBlacklist,
      // Allowed set keys.
      ['id', 'version', 'description', 'authors', 'contributors', 'categories', 'tags'],
      // Allowed get keys.
      [
        'tinyVersion',
        'isReady',
        'layer',
        'options',
        'engine',
        'engineBlacklist',
        'isDestroyed',
        'pluginsSize',
        'plugins',
        'hasPlugin',
        'getPlugin',
        'isDestroyed',
      ],
      // Blocked engine get keys
      ['getPlugin', '_getPlugin', 'plugins', 'installPlugin', '_addPlugin', 'destroyPlugins'],
      // Blocked engine set keys
      [
        'accessControlMode',
        'accessControlWhitelist',
        'accessControlBlacklist',
        'verifyPluginSignature',
        'canAccessEngine',
      ],
    );
  }

  /**
   * Starts the plugin lifecycle by calling the installer.
   * @throws {Error} If the plugin is already ready.
   * @throws {Error} If the initialization fails.
   */
  _startPlugin() {
    checkDestroy(this.#isDestroyed);
    if (this.#isReady) throw new Error('Plugin is already ready.');

    // 1. Freeze options to prevent mutation of the configuration object
    if (this.#options) {
      Object.freeze(this.#options);
    }

    // 2. Create a sandboxed version of 'this' to pass to the installer
    const sandbox = this.#createSandbox();

    try {
      // 3. Execute installer with the sandbox and frozen options
      this.#layer = this.#installer(sandbox, ...this.#options);

      if (!(this.#layer instanceof TinyPluginLayer)) {
        throw new TypeError('Plugin layer is not a valid TinyPluginLayer instance.');
      }

      // 4. Final validation of core identity
      if (!this.#layer.isReady) this.#layer._startLayer();
      if (this.#id.length === 0) throw new Error('Plugin id is not set.');
      if (this.#description.length === 0) throw new Error('Plugin description is not set.');
      if (this.#authors.size === 0) throw new Error('Plugin authors are not set.');
      if (this.#contributors.size === 0) throw new Error('Plugin contributors are not set.');
      if (this.#categories.size === 0) throw new Error('Plugin categories are not set.');
      if (this.#tags.size === 0) throw new Error('Plugin tags are not set.');
      if (!this.#version) throw new Error('Plugin version is not set.');

      this.#isReady = true;
    } catch (error) {
      // 5. Catch initialization errors to prevent host crash
      this.emit('error', error);
      this.destroy();
      throw new Error(
        `Plugin initialization failed: ${error instanceof Error ? error.message : 'Unknown Error'}`,
      );
    }
  }

  /**
   * Destroys the plugin instance.
   */
  destroy() {
    if (this.#isDestroyed) return;
    this.emit('destroyed');
    this.#layer?.emit('destroyed');
    this.#isDestroyed = true;
  }
}

export { TinyPlugin, TinyPluginCore, TinyPluginLayer };
