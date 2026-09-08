import { segmentExtractorV1 } from 'tiny-essentials/regexp/SegmentExtractor';
import TinyCloner from 'tiny-essentials/libs/utils/TinyCloner';
import TinyHttpResponseRegistry from 'tiny-essentials/libs/tools/TinyHttpResponseRegistry';
import TinyPluginCore from './TinyPluginCore.mjs';

const codeIs = TinyHttpResponseRegistry.codeIs;

///////////////////////////////////////////////////////////////////

/**
 * A partial configuration object for Service Worker settings.
 * @typedef {Object} PartialServiceWorkerSettings
 * @property {boolean} [spaMode] - Whether the service worker is running in Single Page Application mode.
 * @property {PartialFetchOptions} fetch - Partial configuration for fetch event interception.
 * @property {Partial<MessagingOptions>} messaging - Partial configuration for message event handling.
 */

/**
 * A partial configuration object for fetch interception settings.
 * @typedef {Object} PartialFetchOptions
 * @property {boolean} [enabled] - Indicates if fetch interception is enabled.
 * @property {Partial<RouterOptions>} router - Partial configuration for the routing logic.
 */

///////////////////////////////////////////////////////////////////

/**
 * Configuration settings for intercepting and handling fetch events.
 * @typedef {Object} FetchOptions
 * @property {boolean} enabled - Indicates if fetch interception is enabled.
 * @property {RouterOptions} router - Configuration for the routing logic.
 */

/**
 * Configuration settings for handling message communication.
 * @typedef {Object} MessagingOptions
 * @property {boolean} enabled - Indicates if message communication is enabled.
 */

/**
 * Configuration settings for the routing logic used during fetch interception.
 * @typedef {Object} RouterOptions
 * @property {boolean} enabled - Indicates if the router is active.
 * @property {Map<number, RouterCodeConfig>} codes - A map linking HTTP status codes to their respective configurations.
 */

/**
 * The complete configuration structure for the Service Worker engine.
 * @typedef {Object} ServiceWorkerSettings
 * @property {boolean} spaMode - Whether the service worker is running in Single Page Application mode.
 * @property {FetchOptions} fetch - Configuration for fetch event interception.
 * @property {MessagingOptions} messaging - Configuration for message event handling.
 */

///////////////////////////////////////////////////////////////////

/**
 * A function that transforms a given path string into another string.
 * @callback PathGetter
 * @param {string} path - The original path string to be transformed.
 * @returns {string} The transformed path string.
 */

/**
 * Data associated with a default HTTP status code response.
 * @typedef {Object} DefaultCodeData
 * @property {PathGetter} pathGetter - A function to retrieve the path for a given input.
 * @property {RouterCodeConfig} data - The configuration data for the default response.
 */

/**
 * Options object passed to the fetch handler function.
 * @typedef {Object} FnOptions
 * @property {FetchEvent} event - The fetch event being handled.
 * @property {Request} request - The request object from the fetch event.
 * @property {URL} url - The parsed URL of the request.
 * @property {HttpResponseType} resType - The categorized response type.
 * @property {string} [customMsg] - A custom error message.
 * @property {string} [customPath] - A custom page path.
 * @property {number} code - The HTTP status code.
 */

/**
 * Configuration for a specific HTTP status code response handler.
 * @typedef {Object} RouterCodeConfig
 * @property {(ops: FnOptions) => Promise<Response> | Response} fn - The function executed to handle the request.
 * @property {string} msg - The message string to be sent in the response.
 * @property {string} logMsg - The log message to be recorded.
 */

/**
 * Represents the raw values returned by a fetch checker.
 * @typedef {Object} FetchCheckerValues
 * @property {number} code - The HTTP status code associated with the fetch result.
 * @property {boolean} needValidation
 * @property {boolean} continueCheck
 * @property {string} [customPath]
 * @property {string} [customMsg]
 */

/**
 * The enriched result from a fetch checker, combining base values with additional data.
 * @typedef {FetchCheckerValues & { [id:string]:any}} FetchCheckerResult
 */

///////////////////////////////////////////////////////////////////

/**
 * The data payload contained within the message.
 * @typedef {Record<any, any>} MessagePayload
 */

/**
 * Represents the structured data format for messages sent via postMessage.
 * @typedef {Object} MessagingData
 * @property {string} type - The identifier for the message type.
 * @property {MessagePayload} [data] - The actual payload of the message.
 */

/**
 * A function used to format a reply message into a standard MessagingData object.
 * @callback MessageReplyTemplate
 * @param {string} type - The type identifier for the reply message.
 * @param {MessagePayload} [data] - The payload to be sent in the reply.
 * @returns {MessagingData} The formatted message object.
 */

/**
 * A function that handles the actual postMessage call to a specific Client.
 * @callback MessageReplyTo
 * @param {Client} client - The target client to receive the message.
 * @param {string} type - The type identifier for the reply message.
 * @param {MessagePayload} [data] - The payload to be sent in the reply.
 */

/**
 * @typedef {Object} MessageReplyToAllOptions
 * @property {string} type - The type identifier for the reply message.
 * @property {MessagePayload} [data] - The payload to be sent in the reply.
 * @property {ClientQueryOptions} [options] - Additional options for client matching.
 */

/**
 * The result of a message broadcast operation.
 * @typedef {Promise<void | readonly (Client | WindowClient)[]>} MessageReplyToAllResponse
 */

/**
 * A function that handles the actual postMessage call to all Clients.
 * @callback MessageReplyToAll
 * @param {MessageReplyToAllOptions} options - The options for the reply.
 * @returns {Promise<MessageReplyToAllResponse>} The result of the broadcast.
 */

/**
 * A function that handles the actual postMessage call to the message source.
 * @callback MessageReply
 * @param {string} type - The type identifier for the reply message.
 * @param {MessagePayload} [data] - The payload to be sent in the reply.
 */

/**
 * An enriched message object containing the event, client information, and utility methods for responding.
 * @typedef {Object} MessageObj
 * @property {ExtendableMessageEvent} event - The original message event.
 * @property {string} clientId - The ID of the client that sent the message.
 * @property {MessagePayload} [data] - The payload sent within the message.
 * @property {MessageReplyTo} replyTo - A function to send a reply to the message source.
 * @property {MessageReplyToAll} replyToAll - A function to send a reply to all clients.
 * @property {MessageReplyTemplate} replyTemplate - A template function to format reply messages.
 * @property {MessageReply} reply - A convenience method to reply to the message source.
 */

/**
 * A callback function executed when a registered message type is received.
 * @callback MessageCallback
 * @param {MessageObj} msg - The enriched message data object.
 */

///////////////////////////////////////////////////////////////////

/**
 * A record of key-value pairs representing URL parameters extracted from a path.
 * @typedef {Record<string, string>} FetchObjParams
 */

/**
 * An enriched data object for fetch plugins.
 * @typedef {Object} FetchObj
 * @property {FetchEvent} event - The original fetch event.
 * @property {Request} request - The intercepted request.
 * @property {URL} url - The parsed URL of the request.
 * @property {FetchObjParams} params - Parameters extracted from the URL (e.g., /:id).
 * @property {MessageReplyTo} replyTo - A function to send a reply to the message source.
 * @property {MessageReplyToAll} replyToAll - A function to send a reply to all clients.
 * @property {MessageReplyTemplate} replyTemplate - A template function to format reply messages.
 * @property {boolean} isSameOrigin
 * @property {Error} [error] - An error object if the plugin execution failed.
 */

/**
 * Callback function executed when the fetchUrls or fetchRegExp route matches.
 * If it returns a boolean `false`, the interception is considered handled.
 * @callback FetchCallback
 * @param {FetchObj} fetchObj - The enriched request object.
 * @param {FetchCheckerResult} result - The result of the fetch check.
 * @returns {Promise<void>|void} A promise or value indicating if the request was handled.
 */

///////////////////////////////////////////////////////////////////

/** @type {ServiceWorkerGlobalScope} */
// @ts-ignore
const sw = self;

/**
 * Formats an error and its associated event into a standardized error object.
 * @param {any} err - The error or value to be wrapped.
 * @param {ExtendableEvent} event - The event associated with the error.
 * @returns {{event: ExtendableEvent, error: Error}} An object containing the event and the error.
 */
const errorMaker = (err, event) => ({
  event,
  error: err instanceof Error ? err : new Error('Unknown Error'),
});

/**
 * @typedef {'info'|'success'|'redirect'|'client-error'|'server-error'|'unknown'} HttpResponseType
 */

/**
 * Maps an HTTP status code to its corresponding response type category.
 * @param {number} code - The HTTP status code to categorize.
 * @returns {HttpResponseType} The categorized response type.
 */
const getResType = (code) => {
  // Informational responses
  if (codeIs.info(code)) return 'info';
  // Successful responses
  if (codeIs.success(code)) return 'success';
  // Redirection messages
  if (codeIs.redirect(code)) return 'redirect';
  // Client error responses
  if (codeIs.clientError(code)) return 'client-error';
  // Server error responses
  if (codeIs.serverError(code)) return 'server-error';
  // Unknown error
  return 'unknown';
};

///////////////////////////////////////////////////////////////////

/**
 * A function used to install a plugin into the engine.
 * @template {string} IdString
 * @template {string} VersionString
 * @template {any[]} Options
 * @typedef {import('./TinyPlugin.mjs').TinyPluginInstaller<TinyServiceWorkerEngine, IdString, VersionString, Options>} SwPluginInstaller
 */

/**
 * Represents a plugin instance designed to be integrated into a TinyServiceWorkerEngine.
 * @template {string} IdString
 * @template {string} VersionString
 * @template {any[]} Options
 * @typedef {import('./TinyPlugin.mjs').default<TinyServiceWorkerEngine, IdString, VersionString, Options>} TinyServiceWorkerPlugin
 */

/**
 * Manages the lifecycle and execution of modules based on the provided configuration.
 */
class TinyServiceWorkerEngine extends TinyPluginCore {
  /**
   * Validates if an event type is a reserved name for the internal lifecycle.
   * @param {string} type - The name of the event to validate.
   * @throws {TypeError} If the event name is in the reserved list.
   */
  static #validateEventType(type) {
    if (type.startsWith('sw:')) {
      throw new TypeError(
        `The event type "${type}" is reserved for internal PWA lifecycle management and cannot be used for Service Worker messaging.`,
      );
    }
  }

  /**
   * A function used to format a reply message into a standard MessagingData object.
   *
   * @param {string} type - The type identifier for the reply message.
   * @param {MessagePayload} [payload] - The payload to be sent in the reply.
   * @returns {MessagingData} The formatted message object.
   * @throws {TypeError} If type is not a string.
   */
  static #replyTemplate(type, payload, strict = false) {
    if (typeof type !== 'string') {
      throw new TypeError(
        `[TinyServiceWorkerEngine] replyTemplate: type must be a string. Received: ${typeof type}`,
      );
    }
    if (
      typeof payload !== 'undefined' &&
      (Array.isArray(payload) || typeof payload !== 'object' || payload === null)
    ) {
      throw new TypeError('Fetch router configuration must be a non-null object.');
    }
    if (strict) TinyServiceWorkerEngine.#validateEventType(type);
    return { type, data: payload };
  }

  /**
   * A function used to format a reply message into a standard MessagingData object.
   *
   * @param {string} type - The type identifier for the reply message.
   * @param {MessagePayload} [payload] - The payload to be sent in the reply.
   * @returns {MessagingData} The formatted message object.
   * @throws {TypeError} If type is not a string.
   */
  static replyTemplate(type, payload) {
    return TinyServiceWorkerEngine.#replyTemplate(type, payload, true);
  }

  /**
   * A function that handles the actual postMessage call to a specific Client.
   *
   * @param {Client} targetSource - The target client to receive the message.
   * @param {string} type - The type identifier for the reply message.
   * @param {MessagePayload} [payload] - The payload to be sent in the reply.
   * @returns {void}
   * @throws {TypeError} If targetSource is invalid or type is not a string.
   */
  static #replyTo(targetSource, type, payload, strict = false) {
    if (!(targetSource instanceof Client)) {
      throw new TypeError(
        `[TinyServiceWorkerEngine] replyTo: targetSource must be a valid Client with a postMessage method.`,
      );
    }
    targetSource.postMessage(TinyServiceWorkerEngine.#replyTemplate(type, payload, strict));
  }

  /**
   * A function that handles the actual postMessage call to a specific Client.
   *
   * @param {Client} targetSource - The target client to receive the message.
   * @param {string} type - The type identifier for the reply message.
   * @param {MessagePayload} [payload] - The payload to be sent in the reply.
   * @returns {void}
   * @throws {TypeError} If targetSource is invalid or type is not a string.
   */
  static replyTo(targetSource, type, payload) {
    return TinyServiceWorkerEngine.#replyTo(targetSource, type, payload, true);
  }

  /**
   * A function that handles the actual postMessage call to all Clients.
   *
   * @param {MessageReplyToAllOptions} ops - The options for the reply.
   * @param {boolean} [strict=false] - Whether to perform strict event type validation.
   * @returns {Promise<MessageReplyToAllResponse>} The result of the broadcast.
   */
  static async #replyToAll(ops, strict = false) {
    const { type, data, options = { type: 'window', includeUncontrolled: true } } = ops;
    return sw.clients.matchAll(options).then((clientList) =>
      clientList.forEach((client) => {
        TinyServiceWorkerEngine.#replyTo(client, type, data, strict);
      }),
    );
  }

  /**
   * A function that handles the actual postMessage call to all Clients.
   *
   * @param {MessageReplyToAllOptions} ops - The options for the reply.
   * @returns {Promise<MessageReplyToAllResponse>} The result of the broadcast.
   */
  static async replyToAll(ops) {
    return TinyServiceWorkerEngine.#replyToAll(ops, true);
  }

  /**
   * Checks if the provided Request object is a navigation request.
   * @param {Request} req - The request to evaluate.
   * @returns {boolean} True if the request mode is 'navigate', false otherwise.
   */
  static isNavigate(req) {
    return req.mode === 'navigate';
  }

  /**
   * Determines whether the origin of a given Request or URL matches the origin of the current Service Worker context.
   * @param {Request|URL} data - The request or URL to check.
   * @returns {boolean} True if the origins match, false otherwise.
   */
  static isSameOrigin(data) {
    // 1. Parse the request URL into a URL object to access its specific components
    const reqUrl = data instanceof Request ? new URL(data.url) : data;

    // 2. Compare the origin of the request with the origin of the Service Worker itself
    // self.location.origin provides the protocol, domain, and port of the Service Worker
    return reqUrl.origin === self.location.origin;
  }

  /**
   * Retrieves the configuration for a specific HTTP status code.
   * @param {number} c - The HTTP status code.
   * @returns {RouterCodeConfig} The configuration for the given code.
   * @throws {TypeError} If c is not a number.
   */
  getCodeCfg(c) {
    if (typeof c !== 'number') throw new TypeError('Code must be a number.');
    /** @type {RouterCodeConfig|undefined} */
    let routerCodeCfg;

    // 1. Check user-defined codes in the Map
    routerCodeCfg = this.#config.fetch.router.codes.get(c);

    // 2. If not found, check for dynamic default configurations
    if (!routerCodeCfg) routerCodeCfg = this.#defaultCode[c].data;

    // 3. If still not found, fallback to the 'unknown' configuration
    if (!routerCodeCfg) {
      routerCodeCfg = this.createFetchRes({
        isError: true,
        msg: this.#globalMsgCode.unknown.msg,
        logMsg: this.#globalMsgCode.unknown.logMsg,
        pathGetter: () => this.globalPathGetter(this.#globalMsgCode.unknown.path),
      });
    }

    return { ...routerCodeCfg };
  }

  /**
   * Sets the SPA mode configuration.
   * @param {boolean} value - The value to set for spaMode.
   * @throws {TypeError} If value is not a boolean.
   */
  set spaMode(value) {
    if (typeof value !== 'boolean') {
      throw new TypeError(`Invalid type for "spaMode": expected boolean, got ${typeof value}`);
    }
    this.#config.spaMode = value;
  }

  /**
   * Gets the current SPA mode configuration.
   * @returns {boolean} The current spaMode value.
   */
  get spaMode() {
    return this.#config.spaMode;
  }

  /**
   * Returns the global path based on the current SPA mode configuration.
   * @param {string} path - The original path.
   * @returns {string} The path adjusted for SPA mode or the original path.
   */
  globalPathGetter(path) {
    return !this.#config.spaMode ? path : this.#globalMsgCode.spaPath;
  }

  #globalMsgCode = {
    spaPath: '/index.html',
    unknown: {
      path: '/500.html',
      msg: 'Unknown',
      logMsg: 'Unknown route error',
    },
    200: {
      path: null,
      msg: 'Success',
      logMsg: 'Valid route',
    },
    404: {
      path: '/404.html',
      msg: 'Not Found',
      logMsg: 'Route not found',
    },
    500: {
      path: '/500.html',
      msg: 'Internal Server Error',
      logMsg: 'Route server error',
    },
  };

  /** @type {{ 200: DefaultCodeData, 404: DefaultCodeData, 500: DefaultCodeData }} */
  #defaultCode = {
    200: {
      pathGetter: (path) => this.globalPathGetter(path),
      data: {
        fn: (ops) =>
          this.fetchFn(
            this.#globalMsgCode[200].msg,
            this.#globalMsgCode[200].logMsg,
            this.#defaultCode[200].pathGetter,
            ops,
          ),
        msg: this.#globalMsgCode[200].msg,
        logMsg: this.#globalMsgCode[200].logMsg,
      },
    },
    404: {
      pathGetter: () => this.globalPathGetter(this.#globalMsgCode[404].path),
      data: {
        fn: (ops) =>
          this.fetchErrorFn(
            this.#globalMsgCode[404].msg,
            this.#globalMsgCode[404].logMsg,
            this.#defaultCode[404].pathGetter,
            ops,
          ),
        msg: this.#globalMsgCode[404].msg,
        logMsg: this.#globalMsgCode[404].logMsg,
      },
    },
    500: {
      pathGetter: () => this.globalPathGetter(this.#globalMsgCode[500].path),
      data: {
        fn: (ops) =>
          this.fetchErrorFn(
            this.#globalMsgCode[500].msg,
            this.#globalMsgCode[500].logMsg,
            this.#defaultCode[500].pathGetter,
            ops,
          ),
        msg: this.#globalMsgCode[500].msg,
        logMsg: this.#globalMsgCode[500].logMsg,
      },
    },
  };

  /**
   * Handles a successful fetch request.
   * @param {string} msg - The message to log.
   * @param {string} logMsg - The log message to record.
   * @param {string|PathGetter} pathGetter - The path to fetch.
   * @param {FnOptions} options - The options for the fetch operation.
   * @returns {Promise<Response>} A promise that resolves to the Response object.
   */
  async fetchFn(msg, logMsg, pathGetter, options) {
    const { url, code, request, customPath } = options;
    const path =
      typeof customPath === 'string'
        ? customPath
        : typeof pathGetter === 'string'
          ? pathGetter
          : pathGetter(url.toString());

    this.log('info', `${code} - ${logMsg}: ${url.pathname}`);
    try {
      const res = await fetch(path === url.toString() ? request : path);
      return res;
    } catch (err) {
      return this.getCodeCfg(500).fn(options);
    }
  }

  /**
   * Handles a failed fetch request by simulating an error page.
   * @param {string} msg - The message to log.
   * @param {string} logMsg - The log message to record.
   * @param {string|PathGetter} pathGetter - The path to fetch.
   * @param {FnOptions} options - The options for the fetch operation.
   * @returns {Promise<Response>} A promise that resolves to the error Response object.
   */
  async fetchErrorFn(msg, logMsg, pathGetter, options) {
    const { url, code, event, request, resType, customMsg, customPath } = options;
    const path =
      typeof customPath === 'string'
        ? customPath
        : typeof pathGetter === 'string'
          ? pathGetter
          : pathGetter(url.toString());

    this.log('warn', `${code} - ${logMsg}: ${url.pathname}`);
    const errMsg = typeof customMsg === 'string' ? customMsg : msg;

    this.emit('fetchError', {
      event,
      request,
      error: new Error(`${code} ${errMsg}`),
      url,
      resType,
    });

    // Simulating Apache2 ErrorDocument behavior by serving path.html with a status
    try {
      const res = await fetch(path);
      return new Response(res.body, {
        status: code,
        statusText: errMsg,
        headers: res.headers,
      });
    } catch {
      return new Response(this.#globalMsgCode[500].msg, { status: 500 });
    }
  }

  /**
   * Creates a configuration for a fetch response.
   * @param {Object} ops - The creation options.
   * @param {boolean} ops.isError - Indicates if it is an error response.
   * @param {string} ops.msg - The message to be sent.
   * @param {string} ops.logMsg - The log message.
   * @param {string|PathGetter} ops.pathGetter - The path to use for the response.
   * @returns {RouterCodeConfig} The newly created configuration.
   */
  createFetchRes({ isError, msg, logMsg, pathGetter }) {
    return {
      fn: (ops) =>
        isError
          ? this.fetchErrorFn(msg, logMsg, pathGetter, ops)
          : this.fetchFn(msg, logMsg, pathGetter, ops),
      msg,
      logMsg,
    };
  }

  /**
   * The internal configuration state of the engine.
   * @type {ServiceWorkerSettings}
   */
  #config = {
    spaMode: false,
    fetch: {
      enabled: true,
      router: {
        enabled: false,
        codes: new Map(),
      },
    },
    messaging: {
      enabled: true,
    },
  };

  /**
   * Sets the engine configuration.
   * @param {ServiceWorkerSettings} config - The new configuration.
   */
  set config(config) {
    this.#updateConfig(config, true);
  }

  /**
   * Gets the current engine configuration.
   * Returns a deep clone to prevent external mutation of the internal state.
   * @returns {ServiceWorkerSettings} A deep cloned copy of the configuration.
   */
  get config() {
    return TinyCloner.clone(this.#config);
  }

  /**
   * A map containing registered message type listeners.
   * @type {Map<string, MessageCallback>}
   */
  #messages = new Map();

  /**
   * A map containing registered fetch RegExp listeners.
   * @type {Map<string, FetchCallback>}
   */
  #fetchRegExp = new Map();

  /**
   * A map containing registered fetch URL listeners.
   * @type {Map<string, FetchCallback>}
   */
  #fetchUrls = new Map();

  /**
   * A map containing the global fetch tracking listeners.
   * @type {Map<string, FetchCallback>}
   */
  #fetchGlobal = new Map();

  /**
   * Flag indicating if the engine has been initialized.
   * @type {boolean}
   */
  #started = false;

  /**
   * Indicates if the engine has been initialized.
   * @returns {boolean} True if started, false otherwise.
   */
  get started() {
    return this.#started;
  }

  /**
   * Performs rigorous deep validation of the configuration object.
   * @param {ServiceWorkerSettings | Partial<PartialServiceWorkerSettings>} config - The configuration object to validate.
   * @param {boolean} [strict=false] - If true, ensures all properties defined in the typedef are present.
   * @throws {TypeError} If any property is of the wrong type or is missing when in strict mode.
   */
  #validateConfig(config, strict = false) {
    if (typeof config !== 'object' || config === null) {
      throw new TypeError('Configuration must be a non-null object.');
    }

    /**
     * Helper to validate existence and type.
     * @template {Record<any, any>} T
     * @param {T} obj - The object containing the property.
     * @param {string} key - The property name.
     * @param {string} type - The expected typeof result.
     * @param {string} context - Context for the error message.
     */
    const validateField = (obj, key, type, context) => {
      const value = obj[key];
      if (strict && value === undefined) {
        throw new TypeError(`Missing required property: "${context}.${key}"`);
      }
      if (value !== undefined && typeof value !== type) {
        throw new TypeError(
          `Invalid type for "${context}.${key}": expected ${type}, got ${typeof value}`,
        );
      }
    };

    validateField(config, 'spaMode', 'boolean', 'root');

    // Deep validation for 'fetch' configuration
    if (config.fetch !== undefined) {
      if (typeof config.fetch !== 'object' || config.fetch === null) {
        throw new TypeError('Fetch configuration must be a non-null object.');
      }
      validateField(config.fetch, 'enabled', 'boolean', 'fetch');

      if (config.fetch.router !== undefined) {
        if (typeof config.fetch.router !== 'object' || config.fetch.router === null) {
          throw new TypeError('Fetch router configuration must be a non-null object.');
        }
        validateField(config.fetch.router, 'enabled', 'boolean', 'fetch.router');

        // Deep validation for 'router.codes' Map
        if (config.fetch.router.codes !== undefined) {
          if (!(config.fetch.router.codes instanceof Map)) {
            throw new TypeError(
              '[TinyServiceWorkerEngine] validateConfig: fetch.router.codes must be a Map.',
            );
          }

          for (const [code, cfg] of config.fetch.router.codes.entries()) {
            // Validate Map Key
            if (typeof code !== 'number') {
              throw new TypeError(
                `[TinyServiceWorkerEngine] validateConfig: Map key must be a number. Received: ${typeof code}`,
              );
            }

            // Validate Map Value (RouterCodeConfig)
            if (typeof cfg !== 'object' || cfg === null) {
              throw new TypeError(
                `[TinyServiceWorkerEngine] validateConfig: Value for code ${code} must be an object.`,
              );
            }

            if (typeof cfg.fn !== 'function') {
              throw new TypeError(
                `[TinyServiceWorkerEngine] validateConfig: cfg.fn for code ${code} must be a function.`,
              );
            }
            if (typeof cfg.msg !== 'string') {
              throw new TypeError(
                `[TinyServiceWorkerEngine] validateConfig: cfg.msg for code ${code} must be a string.`,
              );
            }
            if (typeof cfg.logMsg !== 'string') {
              throw new TypeError(
                `[TinyServiceWorkerEngine] validateConfig: cfg.logMsg for code ${code} must be a string.`,
              );
            }
          }
        } else if (strict) {
          throw new TypeError('Missing required property: "fetch.router.codes"');
        }
      } else if (strict) {
        throw new TypeError('Missing required property: "fetch.router"');
      }
    } else if (strict) {
      throw new TypeError('Missing required property: "fetch"');
    }

    // Deep validation for 'messaging' configuration
    if (config.messaging !== undefined) {
      if (typeof config.messaging !== 'object' || config.messaging === null) {
        throw new TypeError('Messaging configuration must be a non-null object.');
      }
      validateField(config.messaging, 'enabled', 'boolean', 'messaging');
    } else if (strict) {
      throw new TypeError('Missing required property: "messaging"');
    }
  }

  /**
   * Updates the internal configuration.
   * @param {Partial<PartialServiceWorkerSettings>} config - The partial configuration to apply.
   * @param {boolean} [forceFullValidation=false] - Whether to force full validation.
   */
  #updateConfig(config, forceFullValidation = false) {
    this.#validateConfig(config, forceFullValidation);

    // 1. Prepare Messaging configuration
    const newMessaging = config.messaging
      ? { ...this.#config.messaging, ...config.messaging }
      : this.#config.messaging;

    // 2. Prepare Fetch Router configuration
    let newRouter = this.#config.fetch.router;
    if (config.fetch?.router) {
      // Merge the router properties
      newRouter = {
        ...this.#config.fetch.router,
        ...config.fetch.router,
      };

      // If the router contains a Map of codes, create a deep clone of the Map and its values
      if (newRouter.codes instanceof Map) {
        newRouter.codes = new Map(
          Array.from(newRouter.codes, ([code, cfg]) => [
            code,
            { ...cfg }, // Clone of the RouterCodeConfig object
          ]),
        );
      }
    }

    // 3. Prepare Fetch configuration
    const newFetch = config.fetch
      ? {
          ...this.#config.fetch,
          ...config.fetch,
          router: newRouter,
        }
      : this.#config.fetch;

    // 4. Apply to the instance's private state
    this.#config = {
      spaMode: config.spaMode ?? this.#config.spaMode,
      fetch: newFetch,
      messaging: newMessaging,
    };

    // Final validation to ensure the merge did not break type rules
    this.#validateConfig(this.#config, true);
  }

  /**
   * Initializes a new instance of the TinyServiceWorkerEngine with the provided configuration and logger settings.
   * @param {Partial<PartialServiceWorkerSettings>} config - The configuration to apply.
   * @param {Object} [lgConfig] - Configuration options for the instance.
   * @param {boolean} [lgConfig.debugMode=false] - Whether to enable internal debug logging.
   * @param {boolean} [lgConfig.useLogColors=false] - Whether to enable log color support.
   * @param {Partial<Console>} [lgConfig.logger=console] - A custom logger object.
   * @throws {TypeError} If the configuration does not meet the minimum requirements.
   */
  constructor(config = {}, lgConfig = {}) {
    super({
      id: '[_blue_TinySW-Engine_reset_]',
      logger: lgConfig.logger ?? console,
      debugMode: lgConfig.debugMode ?? false,
      useLogColors: lgConfig.useLogColors ?? false,
    });
    this.#updateConfig(config);
  }

  /**
   * Gets the number of registered fetch RegExp listeners.
   * @returns {number} The count of registered RegExp listeners.
   */
  get fetchRegExpSize() {
    return this.#fetchRegExp.size;
  }

  /**
   * Adds a fetch RegExp listener.
   * @param {string} type - The identifier for the fetch type.
   * @param {FetchCallback} callback - The callback to execute.
   */
  addFetchRegExpListener(type, callback) {
    this.#fetchRegExp.set(type, callback);
  }

  /**
   * Removes a fetch RegExp listener.
   * @param {string} type - The identifier for the fetch type.
   * @returns {boolean} True if an element was removed, false otherwise.
   */
  removeFetchRegExpListener(type) {
    return this.#fetchRegExp.delete(type);
  }

  /**
   * Retrieves a fetch RegExp listener.
   * @param {string} type - The identifier for the fetch type.
   * @returns {FetchCallback|undefined} The listener, or undefined if not found.
   */
  getFetchRegExpListener(type) {
    return this.#fetchRegExp.get(type);
  }

  /**
   * Checks if a fetch RegExp listener exists.
   * @param {string} type - The identifier for the fetch type.
   * @returns {boolean} True if it exists, false otherwise.
   */
  hasFetchRegExp(type) {
    return this.#fetchRegExp.has(type);
  }

  /**
   * Clears all registered fetch RegExp listeners.
   * @returns {void}
   */
  clearFetchRegExps() {
    return this.#fetchRegExp.clear();
  }

  /**
   * Gets the number of registered fetch URL listeners.
   * @returns {number} The count of registered URL listeners.
   */
  get fetchUrlSize() {
    return this.#fetchUrls.size;
  }

  /**
   * Adds a fetch URL listener.
   * @param {string} type - The identifier for the fetch type.
   * @param {FetchCallback} callback - The callback to execute.
   */
  addFetchUrlListener(type, callback) {
    this.#fetchUrls.set(type, callback);
  }

  /**
   * Removes a fetch URL listener.
   * @param {string} type - The identifier for the fetch type.
   * @returns {boolean} True if an element was removed, false otherwise.
   */
  removeFetchUrlListener(type) {
    return this.#fetchUrls.delete(type);
  }

  /**
   * Retrieves a fetch URL listener.
   * @param {string} type - The identifier for the fetch type.
   * @returns {FetchCallback|undefined} The listener, or undefined if not found.
   */
  getFetchUrlListener(type) {
    return this.#fetchUrls.get(type);
  }

  /**
   * Checks if a fetch URL listener exists.
   * @param {string} type - The identifier for the fetch type.
   * @returns {boolean} True if it exists, false otherwise.
   */
  hasFetchUrl(type) {
    return this.#fetchUrls.has(type);
  }

  /**
   * Clears all registered fetch URL listeners.
   * @returns {void}
   */
  clearFetchUrls() {
    return this.#fetchUrls.clear();
  }

  /**
   * Gets the number of registered global fetch tracking listeners.
   * @returns {number} The count of registered listeners.
   */
  get fetchGlobalSize() {
    return this.#fetchGlobal.size;
  }

  /**
   * Adds a global fetch tracking listener.
   * @param {string} type - The identifier for the tracking type.
   * @param {FetchCallback} callback - The callback function to be executed.
   */
  addFetchGlobalListener(type, callback) {
    this.#fetchGlobal.set(type, callback);
  }

  /**
   * Removes a global fetch tracking listener.
   * @param {string} type - The identifier of the listener to be removed.
   * @returns {boolean} True if an element was removed, false otherwise.
   */
  removeFetchGlobalListener(type) {
    return this.#fetchGlobal.delete(type);
  }

  /**
   * Retrieves a global fetch tracking listener.
   * @param {string} type - The identifier of the listener.
   * @returns {FetchCallback|undefined} The listener, or undefined if not found.
   */
  getFetchGlobalListener(type) {
    return this.#fetchGlobal.get(type);
  }

  /**
   * Checks if a global fetch tracking listener exists.
   * @param {string} type - The identifier of the listener.
   * @returns {boolean} True if the listener exists, false otherwise.
   */
  hasFetchGlobal(type) {
    return this.#fetchGlobal.has(type);
  }

  /**
   * Clears all global fetch tracking listeners.
   * @returns {void}
   */
  clearFetchGlobals() {
    return this.#fetchGlobal.clear();
  }

  /**
   * Gets the number of registered message listeners.
   * @returns {number} The count of registered message listeners.
   */
  get messagesSize() {
    return this.#messages.size;
  }

  /**
   * Adds a message listener.
   * @param {string} type - The identifier for the message type.
   * @param {MessageCallback} callback - The callback to execute.
   */
  addMessageListener(type, callback) {
    this.#messages.set(type, callback);
  }

  /**
   * Removes a message listener.
   * @param {string} type - The identifier for the message type.
   * @returns {boolean} True if an element was removed, false otherwise.
   */
  removeMessageListener(type) {
    return this.#messages.delete(type);
  }

  /**
   * Retrieves a message listener.
   * @param {string} type - The identifier for the message type.
   * @returns {MessageCallback|undefined} The listener, or undefined if not found.
   */
  getMessageListener(type) {
    return this.#messages.get(type);
  }

  /**
   * Checks if a message listener exists.
   * @param {string} type - The identifier for the message type.
   * @returns {boolean} True if it exists, false otherwise.
   */
  hasMessage(type) {
    return this.#messages.has(type);
  }

  /**
   * Clears all registered message listeners.
   * @returns {void}
   */
  clearMessages() {
    return this.#messages.clear();
  }

  /**
   * Gets a deep clone of the current global message configuration.
   * @returns {Object} A deep cloned copy of the global message configuration.
   */
  get globalMsgCode() {
    return TinyCloner.clone(this.#globalMsgCode);
  }

  /**
   * Updates the global message configuration using a deep clone to prevent mutation.
   * @param {Object} newConfig - The new configuration properties to merge.
   * @throws {TypeError} If newConfig is not a non-null object.
   */
  set globalMsgCode(newConfig) {
    if (typeof newConfig !== 'object' || newConfig === null) {
      throw new TypeError('[TinyServiceWorkerEngine] globalMsgCode must be a non-null object.');
    }
    // Merge and then deep clone the result to ensure the internal state is isolated
    this.#globalMsgCode = TinyCloner.clone({ ...this.#globalMsgCode, ...newConfig });
  }

  /**
   * Adds or updates a custom router configuration for a specific HTTP status code.
   * @param {number} code - The HTTP status code.
   * @param {RouterCodeConfig} config - The configuration object.
   * @throws {TypeError} If code is not a number or config is invalid.
   */
  addRouterCode(code, config) {
    if (typeof code !== 'number') throw new TypeError('Code must be a number.');
    if (typeof config !== 'object' || config === null)
      throw new TypeError('Config must be an object.');
    if (
      typeof config.fn !== 'function' ||
      typeof config.msg !== 'string' ||
      typeof config.logMsg !== 'string'
    ) {
      throw new TypeError(
        'Invalid RouterCodeConfig: fn must be a function, and msg/logMsg must be strings.',
      );
    }

    const newCodes = new Map(this.#config.fetch.router.codes);
    // Deep clone the incoming config before storing it in the Map
    newCodes.set(code, TinyCloner.clone(config));

    this.#updateConfig({
      fetch: {
        router: {
          codes: newCodes,
        },
      },
    });
  }

  /**
   * Removes a custom router configuration for a specific HTTP status code.
   * @param {number} code - The HTTP status code to remove.
   * @returns {boolean} True if a code was removed, false otherwise.
   */
  removeRouterCode(code) {
    const newCodes = new Map(this.#config.fetch.router.codes);
    if (newCodes.delete(code)) {
      this.#updateConfig({
        fetch: {
          router: {
            codes: newCodes,
          },
        },
      });
      return true;
    }
    return false;
  }

  /**
   * Retrieves a deep clone of the current configuration for a specific HTTP status code.
   * @param {number} code - The HTTP status code.
   * @returns {RouterCodeConfig|undefined} A deep cloned copy of the configuration or undefined.
   */
  getRouterCode(code) {
    const cfg = this.#config.fetch.router.codes.get(code);
    // Return a deep clone to prevent the consumer from mutating the engine's internal Map
    return cfg ? TinyCloner.clone(cfg) : undefined;
  }

  /**
   * Performs checks against registered fetchUrls and fetchRegExp to determine if a request should be intercepted.
   *
   * @param {FetchEvent} event - The original fetch event.
   * @param {URL} url - The parsed URL of the request.
   * @returns {Promise<FetchCheckerResult>} A promise that resolves to true if the request should proceed normally, or false if it was handled by a plugin.
   */
  async #fetchChecker(event, url) {
    /** @type {Request} */
    const request = event.request;
    /** @type {FetchCallback|null} */
    let matchedCallback = null;
    const isSameOrigin = TinyServiceWorkerEngine.isSameOrigin(request);

    /** @type {FetchCheckerResult} */
    const result = { code: 404, needValidation: isSameOrigin, continueCheck: true };

    /** @type {FetchObj} */
    const fetchObj = {
      isSameOrigin,
      event,
      request,
      url,
      params: {},
      replyTemplate: TinyServiceWorkerEngine.replyTemplate,
      replyTo: TinyServiceWorkerEngine.replyTo,
      replyToAll: TinyServiceWorkerEngine.replyToAll,
    };

    // 0. Global Tracking Layer (Always executed, regardless of URL or Router)
    for (const callback of this.#fetchGlobal.values()) {
      if (!result.continueCheck) break;
      try {
        // Execute the callback. If it returns false, the request is considered "handled"
        // but since this is a tracking layer, the flow continues according to the router logic.
        await callback(fetchObj, result);
      } catch (error) {
        this.log('error', 'Error in global fetch tracking listener:', error);
        this.emit('fetchGlobalError', { error, fetchObj });
      }
    }

    if (result.continueCheck) {
      // 1. Check in fetchUrls (Exact match and Parameterized match)
      for (const [pattern, callback] of this.#fetchUrls.entries()) {
        // Dynamic parameter matching (e.g., /user/:id)
        if (pattern.includes('/:')) {
          // Converts the key pattern into the extraction Regex
          const seg = segmentExtractorV1(pattern);
          const { match, params } = seg.exec(url.pathname);
          fetchObj.params = { ...fetchObj.params, ...params };
          if (match) {
            matchedCallback = callback;
            break; // Route type detected, breaking the loop
          }
        }

        // Exact match
        if (url.pathname === pattern) {
          matchedCallback = callback;
          break;
        }
      }

      // 2. Check in fetchRegExp (If no match was found in fetchUrls)
      if (!matchedCallback) {
        for (const [regExpStr, callback] of this.#fetchRegExp.entries()) {
          const regex = new RegExp(regExpStr);
          if (regex.test(url.pathname)) {
            matchedCallback = callback;
            break; // Found via raw Regex, breaking the loop
          }
        }
      }

      // 3. Execute the plugin if a match is found
      if (matchedCallback) {
        try {
          this.emit('beforeFetchPlugin', fetchObj);
          await matchedCallback(fetchObj, result);
          this.emit('afterFetchPlugin', fetchObj);
        } catch (error) {
          result.code = 500;
          fetchObj.error = error instanceof Error ? error : new Error('Unknown Error.');
          this.log('error', `Error executing fetch plugin for "${url.pathname}":`, error);
          this.emit('fetchPluginError', fetchObj);
        }
      }
    }

    return result;
  }

  /**
   * Initializes the Service Worker event listeners.
   * @returns {void}
   * @throws {Error} If the engine has already been started.
   */
  init() {
    if (this.#started) throw new Error('TinyServiceWorkerEngine is already initialized.');

    // Force the new Service Worker to become active immediately after installation
    sw.addEventListener('install', (event) => {
      this.emit('beforeSkipWaiting', { event });
      event.waitUntil(
        sw
          .skipWaiting()
          .then(() => {
            this.emit('afterSkipWaiting', { event });
          })
          .catch((err) => this.emit('installError', errorMaker(err, event))),
      );
    });

    // Ensure the new Service Worker takes control of all open clients immediately
    sw.addEventListener('activate', (event) => {
      this.emit('beforeActivated', { event });
      event.waitUntil(
        sw.clients
          .claim()
          .then(() => {
            this.emit('afterActivated', { event });
            this.log('info', 'Activated and claiming clients.');
          })
          .catch((err) => this.emit('activateError', errorMaker(err, event))),
      );
    });

    // Detect fetch events on the website.
    const fetchCfg = this.#config.fetch;
    if (fetchCfg.enabled) {
      sw.addEventListener('fetch', (event) => {
        /** @type {Request} */
        const request = event.request;
        const url = new URL(request.url);
        this.emit('fetchRequested', { event, request, url });

        // Handles navigation requests based on the router configuration.
        const routerCfg = fetchCfg.router;
        event.respondWith(
          (async () => {
            const fetchResult = await this.#fetchChecker(event, url);

            /**
             * @param {number} code
             * @param {string} [customMsg]
             * @param {string} [customPath]
             */
            const buildReply = (code, customMsg, customPath) => {
              if (routerCfg.enabled) {
                const resType = getResType(code);
                const codeCfg = this.getCodeCfg(code);
                return codeCfg.fn({ code, resType, url, request, event, customMsg, customPath });
              }
              return null;
            };

            // 1. Check if the plugin values are correct
            if (typeof fetchResult.continueCheck !== 'boolean') {
              const fetchRes = buildReply(
                500,
                'Received fetch result data with invalid continueCheck format (expected boolean).',
              );
              if (fetchRes !== null) return fetchRes;
            }

            if (!fetchResult.continueCheck) return fetch(request);

            if (
              typeof fetchResult.customPath !== 'undefined' &&
              typeof fetchResult.customPath !== 'string'
            ) {
              const fetchRes = buildReply(
                500,
                'Received fetch result data with invalid customPath format (expected string).',
              );
              if (fetchRes !== null) return fetchRes;
            }

            if (
              typeof fetchResult.customMsg !== 'undefined' &&
              typeof fetchResult.customMsg !== 'string'
            ) {
              const fetchRes = buildReply(
                500,
                'Received fetch result data with invalid customMsg format (expected string).',
              );
              if (fetchRes !== null) return fetchRes;
            }

            if (
              typeof fetchResult.customResponse !== 'undefined' &&
              !(fetchResult.customResponse instanceof Response)
            ) {
              const fetchRes = buildReply(
                500,
                'Received fetch result data with invalid customResponse format (expected Response).',
              );
              if (fetchRes !== null) return fetchRes;
            }

            if (typeof fetchResult.needValidation !== 'boolean') {
              const fetchRes = buildReply(
                500,
                'Received fetch result data with invalid needValidation format (expected boolean).',
              );
              if (fetchRes !== null) return fetchRes;
            }

            if (
              typeof fetchResult.code !== 'number' ||
              Number.isNaN(fetchResult.code) ||
              fetchResult.code < 1
            ) {
              const fetchRes = buildReply(
                500,
                'Received fetch result data with invalid code format (expected number greater than 0).',
              );
              if (fetchRes !== null) return fetchRes;
            }

            // 2. Check if a plugin provided a direct response (e.g., from Cache)
            if (fetchResult.customResponse instanceof Response) {
              return fetchResult.customResponse;
            }

            // 3. Otherwise, proceed with the standard router logic
            if (fetchResult.needValidation) {
              const fetchRes = buildReply(
                fetchResult.code,
                fetchResult.customMsg,
                fetchResult.customPath,
              );

              if (fetchRes !== null) return fetchRes;
            }
            return fetch(request);
          })(),
        );
      });
    }

    // Registers the message event listener for communication with application pages.
    const msgCfg = this.#config.messaging;
    if (msgCfg.enabled) {
      sw.addEventListener('message', (event) => {
        // Validation: Ensure the source is a valid Client
        if (!(event.source instanceof Client)) {
          this.log('error', 'Message received from an invalid source (not a Client).');
          return;
        }

        // Validation: Ensure event.data is a non-null object
        if (Array.isArray(event.data) || typeof event.data !== 'object' || event.data === null) {
          this.log('error', 'Received message with invalid data format (expected object).');
          return;
        }
        if (
          typeof event.data.data !== 'undefined' &&
          (Array.isArray(event.data.data) ||
            typeof event.data.data !== 'object' ||
            event.data.data === null)
        ) {
          this.log('error', 'Received message data with invalid data format (expected object).');
          return;
        }

        // Validation: Ensure 'type' exists and is a string
        if (typeof event.data.type !== 'string') {
          this.log('error', 'Received message with missing or invalid "type" string.');
          return;
        }

        if (event.data.type === 'sw:PrepareUpdate') {
          this.log('info', 'Update signal received. Starting installation...');

          // Force the browser to fetch the latest version of the SW script
          this.emit('beforeUpdated', { event });
          event.waitUntil(
            sw.registration
              .update()
              .then(() => {
                this.emit('afterUpdated', { event });
                TinyServiceWorkerEngine.#replyToAll({ type: 'sw:Updated' });
                this.log('info', 'Update successful, waiting for activation.');
              })
              .catch((error) => {
                const err = error instanceof Error ? error : new Error('Unknown Error.');
                this.emit('updateError', errorMaker(err, event));
                TinyServiceWorkerEngine.#replyToAll({
                  type: 'sw:UpdateError',
                  data: { message: err.message, name: err.name, stack: err.stack },
                });
                this.log('error', 'Update failed:', err);
              }),
          );
        }

        /** @type {Client} */
        const source = event.source;
        /** @type {string} */
        const clientId = source.id;
        /** @type {string} */
        const type = event.data.type;
        /** @type {MessagePayload|undefined} */
        const data = event.data.data;

        // Get the registered message callback
        const message = this.#messages.get(type);

        /** @type {MessageObj} */
        const msgData = {
          event,
          data,
          clientId,
          replyTemplate: TinyServiceWorkerEngine.replyTemplate,
          replyTo: TinyServiceWorkerEngine.replyTo,
          replyToAll: TinyServiceWorkerEngine.replyToAll,
          reply: (nType, payload) => {
            if (!(event.source instanceof Client)) {
              this.log('warn', 'Attempted to reply to a non-client source.');
              return;
            }
            TinyServiceWorkerEngine.replyTo(event.source, nType, payload);
          },
        };

        /** @type {Error|null} */
        let err = null;

        // Emit events
        this.emit('beforeMessage', { event, type, data: msgData });
        const afterData = () => ({ event, type, error: err, data: msgData });
        if (message) {
          event.waitUntil(
            message(msgData)
              .then(() => this.emit('afterMessage', afterData()))
              .catch((/** @type {Error} */ error) => {
                err = error instanceof Error ? error : new Error('Unknown Error');
                this.log('error', `Error executing handler for message type "${type}":`, error);
                this.emit('messageError', afterData());
              }),
          );
        } else {
          this.emit('afterMessage', afterData());
        }
      });
    }

    this.#started = true;
    this.log('info', 'Initialized with custom configuration.');
  }
}

export default TinyServiceWorkerEngine;
