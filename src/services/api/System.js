import { logger } from '../../Console.mjs';
import { dbConnection } from '../../db/connection.js';

/**
 * Represents the global application configuration stored in the local database.
 * @typedef {Object} SystemSettings
 * @property {number} id Fixed ID (usually 1) for the settings record.
 * @property {number} maxItems Maximum number of images to keep in local storage.
 * @property {number} persistentStorage Flag (0/1) indicating if cache cleaning should be skipped.
 */

/**
 * Retrieves the global system settings from the local database.
 * @returns {Promise<SystemSettings>} The current system settings.
 */
export const getSystemSettings = async () => {
  /** @type {SystemSettings[]} */
  const settings = await dbConnection.select({ from: 'Settings', where: { id: 1 } });
  if (settings.length > 0) return settings[0];

  /** @type {SystemSettings} */
  const defaultSettings = { id: 1, maxItems: 10000, persistentStorage: 0 };
  await dbConnection.insert({ into: 'Settings', values: [defaultSettings] });
  return defaultSettings;
};

/**
 * Enforces the local storage limit by deleting the oldest images if the max limit is exceeded.
 * @returns {Promise<void>}
 */
export const enforceStorageLimit = async () => {
  /** @type {SystemSettings} */
  const settings = await getSystemSettings();
  if (settings.persistentStorage === 1) return;

  /** @type {number} */
  const totalImages = await dbConnection.count({ from: 'Images' });

  if (totalImages > settings.maxItems) {
    /** @type {number} */
    const excess = totalImages - settings.maxItems;

    /** @type {any[]} */
    const oldestImages = await dbConnection.select({
      from: 'Images',
      order: { by: 'createdAt', type: 'asc' },
      limit: excess,
    });

    /** @type {number[]} */
    const idsToDelete = oldestImages.map((img) => img.id);

    await dbConnection.remove({
      from: 'Queries',
      where: { imageId: { in: idsToDelete } },
    });

    await dbConnection.remove({
      from: 'Interactions',
      where: { imageId: { in: idsToDelete } },
    });

    await dbConnection.remove({
      from: 'Images',
      where: { id: { in: idsToDelete } },
    });
  }

  /** @type {number} */
  const totalCounters = await dbConnection.count({ from: 'TotalImagesCounter' });

  if (totalCounters > settings.maxItems) {
    /** @type {number} */
    const excessCounters = totalCounters - settings.maxItems;

    /** @type {any[]} */
    const oldestCounters = await dbConnection.select({
      from: 'TotalImagesCounter',
      order: { by: 'updatedAt', type: 'asc' },
      limit: excessCounters,
    });

    /** @type {string[]} */
    const counterIdsToDelete = oldestCounters.map((c) => c.id);

    await dbConnection.remove({
      from: 'TotalImagesCounter',
      where: { id: { in: counterIdsToDelete } },
    });
  }
};

/**
 * Updates the global system settings in the local database.
 * @param {number} maxItems New limit for stored images.
 * @param {number} persistentStorage New persistence state (0/1).
 * @returns {Promise<void>}
 */
export const updateSystemSettings = async (maxItems, persistentStorage) => {
  await dbConnection.update({
    in: 'Settings',
    set: { maxItems, persistentStorage },
    where: { id: 1 },
  });
};

/**
 * Clears cache for specific booru URLs from Images, Queries, and Interactions tables.
 * @param {string[]} booruUrls Array of URLs to target for removal.
 * @returns {Promise<void>}
 */
export const clearSpecificBooruCache = async (booruUrls) => {
  if (!Array.isArray(booruUrls) || booruUrls.length === 0) return;

  /** @type {string[]} */
  const normalizedUrls = booruUrls.map((url) => url);

  try {
    /** @type {object} */
    const whereClause = {
      booruUrl: { in: normalizedUrls },
    };

    // Deleting from all related tables to maintain data integrity
    await dbConnection.remove({ from: 'Queries', where: whereClause });
    await dbConnection.remove({ from: 'Interactions', where: whereClause });
    await dbConnection.remove({ from: 'Images', where: whereClause });
    await dbConnection.remove({ from: 'TotalImagesCounter', where: whereClause });

    logger.log(`Cache cleared for: ${normalizedUrls.join(', ')}`);
  } catch (error) {
    logger.error('Failed to clear specific booru cache:', error);
  }
};

/**
 * Represents a connected booru account and its API credentials.
 * @typedef {Object} Account
 * @property {number} id Internal database ID.
 * @property {string} booruUrl The booru instance URL.
 * @property {string} apiKey User's API key for this booru.
 * @property {number} isActive Flag (0/1) for account enabled status.
 */

/**
 * Fetches all active accounts stored in the local database.
 * @returns {Promise<Account[]>} List of active accounts.
 */
export const getActiveAccounts = async () => {
  return await dbConnection.select({
    from: 'Accounts',
    where: {
      isActive: 1,
    },
  });
};

/**
 * Adds a new booru account to the local database.
 * @param {string} booruUrl URL of the booru.
 * @param {string} apiKey API key for authentication.
 * @returns {Promise<void>}
 */
export const addAccount = async (booruUrl, apiKey) => {
  /** @type {Partial<Account>[]} */
  const accountData = [
    {
      booruUrl: booruUrl,
      apiKey: apiKey,
      isActive: 1,
    },
  ];

  await dbConnection.insert({
    into: 'Accounts',
    values: accountData,
  });
};

/**
 * Toggles the active status of an account in the local database.
 * @param {number} accountId ID of the account.
 * @param {number|boolean} isActive New active state.
 * @returns {Promise<void>}
 */
export const toggleAccountStatus = async (accountId, isActive) => {
  await dbConnection.update({
    in: 'Accounts',
    set: {
      isActive: isActive ? 1 : 0,
    },
    where: {
      id: accountId,
    },
  });
};

/**
 * Fetches all registered accounts from the database, including inactive ones.
 * @returns {Promise<Account[]>} All accounts in DB.
 */
export const getAllAccounts = async () => {
  return await dbConnection.select({
    from: 'Accounts',
  });
};

/**
 * Fetches the API key for a specific booru URL.
 * @param {string} booruUrl Target booru URL.
 * @returns {Promise<string|null>} The API key or null if not found.
 */
export const getAccountBooruApi = async (booruUrl) => {
  const accounts = await dbConnection.select({
    from: 'Accounts',
    where: {
      booruUrl,
    },
  });
  return accounts[0]?.apiKey ?? null;
};

/**
 * Fetches the complete account details for a specific booru URL.
 * @param {string} booruUrl Target booru URL.
 * @returns {Promise<Account|null>} The account object or null if not found.
 */
export const getAccountBooru = async (booruUrl) => {
  const accounts = await dbConnection.select({
    from: 'Accounts',
    where: {
      booruUrl,
    },
  });
  return accounts[0] ?? null;
};

/**
 * Permanently deletes an account from the local database.
 * @param {number} accountId ID of the account to remove.
 * @returns {Promise<void>}
 */
export const deleteAccount = async (accountId) => {
  await dbConnection.remove({
    from: 'Accounts',
    where: {
      id: accountId,
    },
  });
};

/**
 * Clears all registered accounts from the database.
 * @returns {Promise<void>}
 */
export const deleteAllAccounts = async () => {
  await dbConnection.clear('Accounts');
};

/**
 * Completely drops the local IndexedDB database.
 * @returns {Promise<void>}
 */
export const factoryResetDatabase = async () => {
  await dbConnection.dropDb();
};
