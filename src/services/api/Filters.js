import { logger } from '../../Console.mjs';
import { clearImageCache } from './Images.js';
import { fetchPhilomena, throwApiError } from './Philomena.js';

/**
 * Represents a content filter configuration from the Philomena API.
 * @typedef {Object} FilterItem
 * @property {string} description Markdown description of the filter.
 * @property {string|null} hiddenComplex Complex search string for hidden content.
 * @property {number[]} hiddenTagIds List of tag IDs to hide.
 * @property {number} id Unique identifier for the filter.
 * @property {string} name Display name of the filter.
 * @property {boolean} public Whether the filter is visible to all.
 * @property {string|null} spoileredComplex Search string for content to spoiler.
 * @property {number[]} spoileredTagIds List of tag IDs to spoiler.
 * @property {boolean} system Whether it's a built-in booru filter.
 * @property {number} userCount Number of users using this filter.
 * @property {number|null} userId ID of the filter creator.
 */

/**
 * A wrapper object containing a paginated list of filters and the total count.
 * @typedef {Object} FilterObj
 * @property {FilterItem[]} filters List of filters.
 * @property {number} total Total available filters.
 */

/**
 * Parses raw JSON responses containing lists of Philomena filters.
 * @param {Record<string, any>} result The raw API response.
 * @returns {FilterObj} Formatted and validated filter list.
 */
const parseFilterList = (result) => {
  const ctx = 'Filter List';
  if (typeof result.total !== 'number') throwApiError(ctx, 'result.total');
  if (!Array.isArray(result.filters)) throwApiError(ctx, 'result.filters');

  return {
    total: result.total,
    filters: result.filters.map((filter) => {
      if (typeof filter.description !== 'string') throwApiError(ctx, 'filter.description');
      if (typeof filter.hidden_complex !== 'string' && filter.hidden_complex !== null)
        throwApiError(ctx, 'filter.hidden_complex');
      if (typeof filter.spoilered_complex !== 'string' && filter.spoilered_complex !== null)
        throwApiError(ctx, 'filter.spoilered_complex');

      if (
        !Array.isArray(filter.hidden_tag_ids) ||
        !filter.hidden_tag_ids.every((tagId) => typeof tagId === 'number')
      ) {
        throwApiError(ctx, 'filter.hidden_tag_ids');
      }

      if (
        !Array.isArray(filter.spoilered_tag_ids) ||
        !filter.spoilered_tag_ids.every((tagId) => typeof tagId === 'number')
      ) {
        throwApiError(ctx, 'filter.spoilered_tag_ids');
      }

      if (typeof filter.id !== 'number') throwApiError(ctx, 'filter.id');
      if (typeof filter.name !== 'string') throwApiError(ctx, 'filter.name');
      if (typeof filter.public !== 'boolean') throwApiError(ctx, 'filter.public');
      if (typeof filter.system !== 'boolean') throwApiError(ctx, 'filter.system');
      if (typeof filter.user_count !== 'number') throwApiError(ctx, 'filter.user_count');
      if (typeof filter.user_id !== 'number' && filter.user_id !== null)
        throwApiError(ctx, 'filter.user_id');

      return {
        description: filter.description,
        hiddenComplex: filter.hidden_complex,
        hiddenTagIds: filter.hidden_tag_ids,
        id: filter.id,
        name: filter.name,
        public: filter.public,
        spoileredComplex: filter.spoilered_complex,
        spoileredTagIds: filter.spoilered_tag_ids,
        system: filter.system,
        userCount: filter.user_count,
        userId: filter.user_id,
      };
    }),
  };
};

/**
 * Fetches the system-wide filters natively available on the specific booru.
 * @param {string} booruUrl Target booru URL.
 * @param {number} [page=1] Page number.
 * @returns {Promise<FilterObj>} List of system filters.
 */
export const fetchSystemFilters = async (booruUrl, page = 1) => {
  const data = await fetchPhilomena(booruUrl, 'filters/system', '', { page });
  return parseFilterList(data);
};

/**
 * Fetches the customized filters tied to the given user's API key.
 * @param {string} booruUrl Target booru URL.
 * @param {string} apiKey User authentication key.
 * @param {number} [page=1] Page number.
 * @returns {Promise<FilterObj>} List of user filters.
 */
export const fetchUserFilters = async (booruUrl, apiKey, page = 1) => {
  const data = await fetchPhilomena(booruUrl, 'filters/user', apiKey, { page });
  return parseFilterList(data);
};

/**
 * Retrieves the currently selected filter ID for the given booru from local storage, auto-assigning one if empty.
 * @param {string} booruUrl Target booru URL.
 * @returns {Promise<number|null>} The active filter ID.
 */
export const getBooruFilterId = async (booruUrl) => {
  /** @type {Record<string, number>} */
  const storedFilters = JSON.parse(localStorage.getItem('app_booruFilters') || '{}');

  if (storedFilters[booruUrl]) {
    return storedFilters[booruUrl];
  }

  // Auto-defines default system filter if none is set
  try {
    /** @type {FilterObj} */
    const result = await fetchSystemFilters(booruUrl, 1);

    if (result && Array.isArray(result.filters) && result.filters.length > 0) {
      /** @type {number} */
      const defaultFilterId = result.filters[0].id;
      storedFilters[booruUrl] = defaultFilterId;
      localStorage.setItem('app_booruFilters', JSON.stringify(storedFilters));
      await clearImageCache();
      return defaultFilterId;
    }
  } catch (error) {
    logger.error(`Failed to fetch default filter for ${booruUrl}:`, error);
  }

  return null;
};

/**
 * Saves filter preferences for boorus to local storage and flushes the image cache.
 * @param {Record<string, number>} newFiltersData Map of booru URLs to filter IDs.
 * @returns {Promise<void>}
 */
export const saveBooruFilters = async (newFiltersData) => {
  localStorage.setItem('app_booruFilters', JSON.stringify(newFiltersData));
  await clearImageCache();
};
