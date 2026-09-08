import TinySimpleDice from 'tiny-essentials/libs/math/TinySimpleDice';
import { dbConnection } from '../../db/connection.js';
import { getBooruFilterId } from './Filters.js';
import { fetchPhilomena, throwApiError } from './Philomena.js';
import { enforceStorageLimit, getActiveAccounts } from './System.js';
import { checkArray, checkItem } from './utils.js';

/** @typedef {import('./System.js').Account} Account */

/**
 * Represents a single user comment retrieved from the booru.
 * @typedef {Object} CommentData
 * @property {string} author - The username of the commenter.
 * @property {string} avatar - The URL to the commenter's avatar.
 * @property {string} body - The markdown content of the comment.
 * @property {Date} createdAt - The timestamp of creation.
 * @property {string|null} editReason - The reason provided for the last edit.
 * @property {Date|null} editedAt - The timestamp of the last edit, if any.
 * @property {number} id - Unique identifier for the comment.
 * @property {number} imageId - The ID of the image this comment belongs to.
 * @property {Date} updatedAt - The timestamp of the last update.
 * @property {number|null} userId - The ID of the user who posted the comment.
 */

/**
 * A wrapper object containing a paginated list of comments and the total count.
 * @typedef {Object} CommentObj
 * @property {number} total - The total number of comments matching the query.
 * @property {CommentData[]} comments - The list of comment data objects.
 */

/**
 * Fetches and parses comments based on a specific query.
 * @param {string} booruUrl - Base URL of the booru.
 * @param {string} apiKey - User API key.
 * @param {string} [query='*'] - Search query for comments.
 * @param {number} [page=1] - Page number for pagination.
 * @param {AbortSignal} [signal]
 * @returns {Promise<CommentObj>} Parsed comments and metadata.
 */
export const fetchComments = async (
  booruUrl,
  apiKey,
  query = '*',
  page = 1,
  signal = undefined,
) => {
  const result = await fetchPhilomena(
    booruUrl,
    'search/comments',
    apiKey,
    { q: query, page },
    signal,
  );
  const ctx = 'Comments Search';

  if (typeof result.total !== 'number') throwApiError(ctx, 'result.total');
  if (!Array.isArray(result.comments)) throwApiError(ctx, 'result.comments');

  return {
    total: result.total,
    comments: result.comments.map((comment) => {
      if (typeof comment.author !== 'string') throwApiError(ctx, 'comment.author');
      if (typeof comment.avatar !== 'string') throwApiError(ctx, 'comment.avatar');
      if (typeof comment.body !== 'string') throwApiError(ctx, 'comment.body');
      if (typeof comment.created_at !== 'string') throwApiError(ctx, 'comment.created_at');
      if (typeof comment.edit_reason !== 'string' && comment.edit_reason !== null)
        throwApiError(ctx, 'comment.edit_reason');
      if (typeof comment.edited_at !== 'string' && comment.edited_at !== null)
        throwApiError(ctx, 'comment.edited_at');
      if (typeof comment.id !== 'number') throwApiError(ctx, 'comment.id');
      if (typeof comment.image_id !== 'number') throwApiError(ctx, 'comment.image_id');
      if (typeof comment.updated_at !== 'string') throwApiError(ctx, 'comment.updated_at');
      if (typeof comment.user_id !== 'number' && comment.user_id !== null)
        throwApiError(ctx, 'comment.user_id');

      return {
        author: comment.author,
        avatar: comment.avatar,
        body: comment.body,
        createdAt: new Date(comment.created_at),
        editReason: comment.edit_reason,
        editedAt: comment.edited_at ? new Date(comment.edited_at) : null,
        id: comment.id,
        imageId: comment.image_id,
        updatedAt: new Date(comment.updated_at),
        userId: comment.user_id,
      };
    }),
  };
};

/**
 * Represents the type of interaction a user had with an image.
 * @typedef {'faved'|'upVote'|'downVote'|null} InteractionValue
 */

/**
 * Represents a user's interaction record for a specific image on a specific booru.
 * @typedef {Object} InteractionObj
 * @property {string} id - Unique composite key for the interaction.
 * @property {string} booruUrl - The source booru URL.
 * @property {number} imageId - The ID of the image.
 * @property {InteractionValue} value - The type of interaction performed.
 */

/**
 * Contains URLs for various sizes and formats of a processed image.
 * @typedef {Object} ImageRepresentations
 * @property {string} full - Original full-size image URL.
 * @property {string} small - Small version URL.
 * @property {string} thumb_tiny - Tiny thumbnail URL.
 * @property {string} thumb_small - Small thumbnail URL.
 * @property {string} thumb - Standard thumbnail URL.
 * @property {string} medium - Medium size URL.
 * @property {string} large - Large size URL.
 * @property {string} tall - Tall version URL.
 */

/**
 * Represents the color or light intensity values for different quadrants of an image.
 * @typedef {Object} ImageIntensities
 * @property {number} ne - Northeast quadrant intensity.
 * @property {number} nw - Northwest quadrant intensity.
 * @property {number} se - Southeast quadrant intensity.
 * @property {number} sw - Southwest quadrant intensity.
 */

/**
 * Represents the comprehensive data of a single image parsed from the API.
 * @typedef {Object} ImageObj
 * @property {string} format - File format.
 * @property {number} commentCount - Number of comments.
 * @property {number} id - The image's unique ID.
 * @property {string} booruUrl - The source booru URL.
 * @property {string} name - The filename or title.
 * @property {string[]} tags - List of tags associated with the image.
 * @property {number[]} tagIds - List of tag ids associated with the image.
 * @property {string[]} sourceUrls - List of source links.
 * @property {string} viewUrl - File link.
 * @property {number} faves - Number of favorites.
 * @property {number} size - File size in bytes.
 * @property {number|null} uploaderId - ID of the uploader.
 * @property {string} description - Image description markdown.
 * @property {string} mimeType - The file MIME type.
 * @property {number} downvotes - Number of downvotes.
 * @property {number} upvotes - Number of upvotes.
 * @property {number} origSize - Original file size before processing.
 * @property {ImageRepresentations} representations - Object containing different image sizes.
 * @property {number} updatedAt - Unix timestamp of the last update.
 * @property {number} createdAt - Unix timestamp of creation.
 * @property {number} firstSeenAt - Unix timestamp of when the image was first indexed.
 * @property {string|null} sha512Hash - SHA512 hash of the file.
 * @property {string|null} uploader - Username of the uploader.
 * @property {string|null} origSha512Hash - Original SHA512 hash.
 * @property {number} hiddenFromUsers - Binary flag (0/1) for hidden status.
 * @property {number} spoilered - Binary flag (0/1) for spoiler status.
 * @property {number} processed - Binary flag (0/1) for processing status.
 * @property {number} thumbnailsGenerated - Binary flag (0/1) for thumbnail status.
 * @property {number} animated - Binary flag (0/1) for animation status.
 * @property {number} aspectRatio - The width/height ratio.
 * @property {number|null} duplicateOf - ID of the original image if this is a duplicate.
 * @property {string|null} deletionReason - Reason for deletion if applicable.
 * @property {number} height - Pixel height.
 * @property {number} width - Pixel width.
 * @property {string} sourceUrl - Primary source URL.
 * @property {number} wilsonScore - Calculated popularity score.
 * @property {ImageIntensities|null} intensities - Brightness data for the image.
 */

/**
 * Extends the ImageObj to include the current user's interaction state with the image.
 * @typedef {ImageObj & { interaction: InteractionValue }} ImageResult
 */

/**
 * Fetches images from the booru API using a search query and automatically applies the user's selected filter.
 * @param {string} booruUrl - The source booru.
 * @param {string} apiKey - Authentication key.
 * @param {string} query - Search query string.
 * @param {number} [page] - Page number.
 * @param {number} [perPage] - Items per page.
 * @param {string} [sd] - Sort direction ('asc' or 'desc').
 * @param {string} [sf] - Sort field (e.g., 'created_at').
 * @param {number|null} [limit=null] - Content limit.
 * @param {AbortSignal} [signal]
 * @returns {Promise<{ total: number; interactions: any[]; images: any[] }>} Raw API response data.
 */
export const searchImagesApi = async (
  booruUrl,
  apiKey,
  query,
  page,
  perPage,
  sd,
  sf,
  limit,
  signal = undefined,
) => {
  /** @type {Record<string, any>} */
  const data = { q: query };

  if (typeof page === 'number') data.page = page;
  if (typeof perPage === 'number') data.per_page = perPage;
  if (typeof sd === 'string') data.sd = sd;
  if (typeof sf === 'string') data.sf = sf;
  if (typeof limit === 'number') data.limit = limit;

  const filterId = await getBooruFilterId(booruUrl);
  if (filterId) {
    data.filter_id = filterId;
  }

  const result = await fetchPhilomena(booruUrl, 'search/images', apiKey, data, signal);
  const ctx = 'Image Search';

  if (typeof result.total !== 'number') throwApiError(ctx, 'result.total');
  if (!Array.isArray(result.interactions)) throwApiError(ctx, 'result.interactions');
  if (!Array.isArray(result.images)) throwApiError(ctx, 'result.images');

  return result;
};

/**
 * Normalizes a query string by sorting tags alphabetically to ensure consistent caching.
 * @param {string} rawQuery - The original query string.
 * @returns {string} The normalized query string.
 */
const normalizeQueryString = (rawQuery) => {
  if (rawQuery === '*' || rawQuery.trim() === '') return '*';
  return rawQuery
    .split(',')
    .map((term) => term.trim().toLowerCase())
    .filter((term) => term !== '')
    .sort()
    .join(', ');
};

/**
 * Internal tracking for total images per query to manage pagination.
 * @typedef {Object} TotalImagesCounter
 * @property {string} id Unique identifier for the counter (booru + query).
 * @property {string} booruUrl The associated booru URL.
 * @property {string} query The normalized search query.
 * @property {number} total The total count reported by the API.
 * @property {number} updatedAt Timestamp of the last update.
 */

/**
 * Represents a cached search query linked to specific images in the database.
 * @typedef {Object} QueryItem
 * @property {string} id Unique key for the query-image relationship.
 * @property {number} imageId The ID of the associated image.
 * @property {number} createdAt The timestamp when the image was created (for sorting).
 * @property {string} query The normalized query string.
 */

/**
 * Parses raw image data from the Philomena API into the format required by the local database.
 * @param {string} booruUrl - The source booru URL.
 * @param {Record<string, any>} img - Raw image object from API.
 * @returns {ImageObj} Formatted and validated image object.
 */
export const parseImageData = (booruUrl, img) => ({
  id: img.id,
  booruUrl,
  name: img.name,
  format: img.format,
  tags: checkArray(img.tags, 'string'),
  tagIds: checkArray(img.tag_ids, 'number'),
  viewUrl: img.view_url,
  sourceUrls: checkArray(img.source_urls, 'string'),
  faves: img.faves,
  size: img.size,
  uploaderId: img.uploader_id,
  uploader: img.uploader,
  description: img.description,
  mimeType: img.mime_type,
  downvotes: img.downvotes,
  upvotes: img.upvotes,
  origSize: img.orig_size,
  commentCount: img.comment_count,
  representations: {
    full: checkItem(img.representations.full, 'string'),
    small: checkItem(img.representations.small, 'string'),
    thumb_tiny: checkItem(img.representations.thumb_tiny, 'string'),
    thumb_small: checkItem(img.representations.thumb_small, 'string'),
    thumb: checkItem(img.representations.thumb, 'string'),
    medium: checkItem(img.representations.medium, 'string'),
    large: checkItem(img.representations.large, 'string'),
    tall: checkItem(img.representations.tall, 'string'),
  },
  intensities: img.intensities
    ? {
        ne: checkItem(img.intensities.ne, 'number'),
        nw: checkItem(img.intensities.nw, 'number'),
        se: checkItem(img.intensities.se, 'number'),
        sw: checkItem(img.intensities.sw, 'number'),
      }
    : null,
  updatedAt: new Date(img.updated_at).valueOf(),
  createdAt: new Date(img.created_at).valueOf(),
  firstSeenAt: new Date(img.first_seen_at).valueOf(),
  sha512Hash: img.sha512_hash,
  hiddenFromUsers: img.hidden_from_users ? 1 : 0,
  origSha512Hash: img.orig_sha512_hash,
  wilsonScore: img.wilson_score,
  thumbnailsGenerated: img.thumbnails_generated ? 1 : 0,
  aspectRatio: img.aspect_ratio,
  deletionReason: img.deletion_reason,
  duplicateOf: img.duplicate_of,
  animated: img.animated ? 1 : 0,
  spoilered: img.spoilered ? 1 : 0,
  processed: img.processed ? 1 : 0,
  height: img.height,
  width: img.width,
  sourceUrl: img.source_url,
});

/**
 * Normalizes an Image object restoring boolean fields.
 *
 * The argument is database image record (using 0/1).
 * This returns the object with restored boolean types.
 */
export const fixImageObj = (img) => {
  // @ts-ignore
  img.animated = img.animated ? true : false;
  // @ts-ignore
  img.hiddenFromUsers = img.hiddenFromUsers ? true : false;
  // @ts-ignore
  img.processed = img.processed ? true : false;
  // @ts-ignore
  img.spoilered = img.spoilered ? true : false;
  // @ts-ignore
  img.thumbnailsGenerated = img.thumbnailsGenerated ? true : false;
  // @ts-ignore
  return img;
};

/** @type {Record<string, number>} Internal counter for sync operations per booru. */
const syncTimes = {};

/**
 * Formats interaction data from an API response into local InteractionObj records.
 * @param {string} booruUrl - The source booru URL.
 * @param {{ total: number; interactions: any[]; images: any[] }} data - The API response data.
 * @returns {InteractionObj[]} List of formatted interactions.
 */
const getInteractions = (booruUrl, data) => {
  /** @type {InteractionObj[]} */
  const formattedInteractions = [];

  /** @type {InteractionObj[]} */
  data.interactions.forEach((int) => {
    const value =
      int.interaction_type === 'faved'
        ? 'faved'
        : int.interaction_type === 'voted'
          ? int.value === 'up'
            ? 'upVote'
            : int.value === 'down'
              ? 'downVote'
              : null
          : null;

    const id = `${booruUrl}_${int.image_id}`;
    const oldInteraction = formattedInteractions.find((int2) => int2.id === id);
    if (oldInteraction) {
      if (value === 'faved') oldInteraction.value = value;
      return;
    }

    formattedInteractions.push({
      id,
      booruUrl,
      imageId: int.image_id,
      value,
    });
  });

  return formattedInteractions;
};

/**
 * Downloads a page of images from the specified booru and inserts it into the local IndexedDB.
 * @param {string} booruUrl - The booru instance URL.
 * @param {string} apiKey - The user's API key.
 * @param {string} [query='*'] - The search query.
 * @param {number} [page=1] - The page number to fetch.
 * @param {number} [perPage] - Results per page.
 * @param {string} [sd] - Sort direction.
 * @param {string} [sf] - Sort field.
 * @param {number|null} [limit=null] - Content limit.
 * @returns {Promise<any>} The raw data returned by the API.
 */
const syncGalleryPage = async (
  booruUrl,
  apiKey,
  query = '*',
  page = 1,
  perPage = undefined,
  sd = undefined,
  sf = undefined,
  limit = null,
) => {
  if (typeof syncTimes[booruUrl] !== 'number') syncTimes[booruUrl] = 0;
  syncTimes[booruUrl]++;
  const time = syncTimes[booruUrl];

  try {
    const data = await searchImagesApi(booruUrl, apiKey, query, page, perPage, sd, sf, limit);
    /** @type {string} */
    const normalizedQuery = normalizeQueryString(query);

    // Grab the local images that currently map to this page range BEFORE upserting
    const localPageImages = await searchImages({
      query,
      limit: perPage || 50,
      page,
      allowedBoorus: [booruUrl],
      sd,
      sf,
    });

    /** @type {number[]} */
    const localImageIds = localPageImages.map((img) => img.id);
    /** @type {number[]} */
    const fetchedImageIds = data.images.map((img) => img.id);

    // Identify images that were previously on this page but vanished (hidden, deleted or shifted)
    const staleImageIds = localImageIds.filter((id) => !fetchedImageIds.includes(id));

    if (staleImageIds.length > 0) {
      await dbConnection.remove({
        from: 'Images',
        where: { booruUrl: booruUrl, id: { in: staleImageIds } },
      });
      await dbConnection.remove({
        from: 'Interactions',
        where: { booruUrl: booruUrl, imageId: { in: staleImageIds } },
      });
      await dbConnection.remove({
        from: 'Queries',
        where: { booruUrl: booruUrl, imageId: { in: staleImageIds } },
      });
    }

    /** @type {ImageObj[]} */
    const formattedImages = data.images.map((img) => parseImageData(booruUrl, img));
    const formattedInteractions = getInteractions(booruUrl, data);

    await dbConnection.insert({ into: 'Images', values: formattedImages, upsert: true });

    if (formattedInteractions.length > 0) {
      await dbConnection.insert({
        into: 'Interactions',
        values: formattedInteractions,
        upsert: true,
      });
    }

    /** @type {number[]} */
    const interactedImageIds = data.interactions.map((int) => int.image_id);
    /** @type {number[]} */
    const nonInteractedImageIds = fetchedImageIds.filter((id) => !interactedImageIds.includes(id));

    if (nonInteractedImageIds.length > 0) {
      /** @type {string[]} */
      const interactionIdsToRemove = nonInteractedImageIds.map((id) => `${booruUrl}_${id}`);
      await dbConnection.remove({
        from: 'Interactions',
        where: { id: { in: interactionIdsToRemove } },
      });
    }

    if (normalizedQuery !== '*') {
      /** @type {QueryItem[]} */
      const queryEntries = formattedImages.map((img) => ({
        id: `${booruUrl}_${img.id}_${normalizedQuery}`,
        imageId: img.id,
        booruUrl,
        createdAt: img.createdAt,
        query: normalizedQuery,
      }));
      await dbConnection.insert({ into: 'Queries', values: queryEntries, upsert: true });
    }

    await dbConnection.insert({
      into: 'TotalImagesCounter',
      values: [
        {
          id: `${booruUrl}_${normalizedQuery}`,
          booruUrl: booruUrl,
          query: normalizedQuery,
          total: data.total,
          updatedAt: Date.now(),
        },
      ],
      upsert: true,
    });

    await enforceStorageLimit();

    console.log(`Synced page ${page} from ${booruUrl} (${time})`);
    return data;
  } catch (error) {
    console.error('Failed to sync gallery page:', error);
  }
};

/**
 * Background task that syncs gallery pages for multiple connected accounts.
 * @param {Object} [config] - Configuration object.
 * @param {string} [config.query='*'] - Search query.
 * @param {number} [config.page=1] - Page number.
 * @param {number|null} [config.limit=null] - Content limit.
 * @param {string[]|null} [config.allowedBoorus=null] - Boorus to sync.
 * @param {number} [config.perPage=50] - Limit per booru.
 * @param {Account} [config.account] - Specific account to sync.
 * @param {string} [config.sd='desc'] - Sort direction.
 * @param {string} [config.sf='created_at'] - Sort field.
 * @returns {Promise<{ accounts: Account[]; syncLimit: number; totalCount: number; }>} Sync operation summary.
 */
export const syncUserGalleryPages = async ({
  query = '*',
  page = 1,
  limit = null,
  allowedBoorus = null,
  perPage = 50,
  account,
  sd = 'desc',
  sf = 'created_at',
} = {}) => {
  const allAccounts = !account ? await getActiveAccounts() : [account];

  // Hard filters the accounts to prevent unnecessary API requests
  const accounts = allowedBoorus
    ? allAccounts.filter((acc) => allowedBoorus.includes(acc.booruUrl))
    : allAccounts;

  if (accounts.length === 0) return { accounts: [], syncLimit: perPage, totalCount: 0 };

  const syncs = accounts.map((account) =>
    syncGalleryPage(account.booruUrl, account.apiKey, query, page, perPage, sd, sf, limit),
  );

  const results = await Promise.all(syncs);

  let combinedTotal = 0;

  results.forEach((data) => {
    if (data && typeof data.total === 'number') combinedTotal += data.total;
  });

  const finalLimit = perPage * accounts.length;

  return { accounts, syncLimit: finalLimit, totalCount: combinedTotal };
};

/**
 * Queries the local IndexedDB for images that match a given search string.
 * @param {Object} config - Configuration object.
 * @param {string} [config.query='*'] - Filter query.
 * @param {number} [config.limit=50] - Result limit.
 * @param {number} [config.page=1] - Page number.
 * @param {string[]|null} [config.allowedBoorus=null] - List of boorus to include.
 * @param {string} [config.sd='desc'] - Sort direction.
 * @param {string} [config.sf='created_at'] - Sort field.
 * @returns {Promise<ImageResult[]>} The list of matching images from local DB.
 */
export const searchImages = async ({
  query = '*',
  limit = 50,
  page = 1,
  allowedBoorus = null,
  sd = 'desc',
  sf = 'created_at',
}) => {
  if (allowedBoorus && allowedBoorus.length === 0) return [];

  /** @type {number} */
  const fixedLimit = limit > 1000 ? 1000 : limit;
  /** @type {string} */
  const normalizedQuery = normalizeQueryString(query);

  // Calculate total cached items to adjust pagination gracefully when deep-linking
  const totalCached = await countImages(query, allowedBoorus);

  /** @type {number} */
  let skipCount = (page - 1) * fixedLimit;

  // Clamps the skip count to the maximum available items if user jumped to a far page
  if (totalCached > 0 && skipCount >= totalCached) {
    skipCount = Math.max(0, Math.floor((totalCached - 1) / fixedLimit) * fixedLimit);
  }

  /** @type {string} */
  let sortField = 'createdAt';
  switch (sf) {
    case 'updated_at':
      sortField = 'updatedAt';
      break;
    case 'first_seen_at':
      sortField = 'firstSeenAt';
      break;
    case 'score':
    case 'wilson_score':
      sortField = 'wilsonScore';
      break;
    case 'upvotes':
      sortField = 'upvotes';
      break;
    case 'downvotes':
      sortField = 'downvotes';
      break;
    case 'faves':
      sortField = 'faves';
      break;
    case 'comments':
    case 'comment_count':
      sortField = 'commentCount';
      break;
    case 'size':
      sortField = 'size';
      break;
    case 'width':
      sortField = 'width';
      break;
    case 'height':
      sortField = 'height';
      break;
    default:
      sortField = 'createdAt';
      break;
  }

  /** @type {string} */
  const sortType = sd && sd.toLowerCase() === 'asc' ? 'asc' : 'desc';

  /** @type {ImageResult[]} */
  let results = [];

  if (normalizedQuery === '*') {
    /** @type {object|undefined} */
    const whereClause = allowedBoorus ? { booruUrl: { in: allowedBoorus } } : undefined;

    results = await dbConnection.select({
      from: 'Images',
      where: whereClause,
      limit: fixedLimit,
      skip: skipCount,
      order: { by: sortField, type: sortType },
    });
  } else {
    /** @type {ImageObj[]} */
    const gatheredResults = [];
    /** @type {number} */
    let currentSkip = skipCount;
    /** @type {number} */
    const batchSize = fixedLimit;

    // Loop to keep fetching until we fill the requested limit or run out of data
    while (gatheredResults.length < fixedLimit) {
      /** @type {any[]} */
      const batch = await dbConnection.select({
        from: 'Queries',
        where: { query: normalizedQuery },
        join: {
          with: 'Images',
          on: 'Queries.imageId = Images.id',
          as: { id: 'imageId', createdAt: 'imgCreatedAt', booruUrl: 'imgBooruUrl' },
          type: 'inner',
        },
        limit: batchSize,
        skip: currentSkip,
        order: { by: `Images.${sortField}`, type: sortType },
      });

      // Stop if the database has no more records for this query
      if (batch.length === 0) break;

      /** @type {any[]} */
      let filteredBatch = batch;
      if (allowedBoorus) {
        filteredBatch = batch.filter((item) => allowedBoorus.includes(item.imgBooruUrl));
      }

      gatheredResults.push(...filteredBatch);
      /** @type {number} */
      currentSkip += batch.length;

      // If the DB returned less than the batch size, we reached the end of the records
      if (batch.length < batchSize) break;
    }

    // Process and clean the results to match the expected format
    // @ts-ignore
    results = gatheredResults.slice(0, fixedLimit).map((item) => {
      // @ts-ignore
      item.id = item.imageId;
      // @ts-ignore
      item.booruUrl = item.imgBooruUrl;
      // @ts-ignore
      delete item.imageId;
      // @ts-ignore
      delete item.imgCreatedAt;
      // @ts-ignore
      delete item.imgBooruUrl;
      // @ts-ignore
      delete item.query;
      fixImageObj(item);
      return item;
    });
  }

  if (results.length > 0) {
    /** @type {number[]} */
    const imageIds = results.map((img) => img.id);

    /** @type {InteractionObj[]} */
    const interactions = await dbConnection.select({
      from: 'Interactions',
      where: { imageId: { in: imageIds } },
    });

    results = results.map((item) => {
      item.interaction =
        {
          ...interactions.find((int) => int.imageId === item.id && int.booruUrl === item.booruUrl),
        }.value ?? null;
      return item;
    });
  }

  return results;
};

/**
 * Returns the total count of images in the database for a specific query.
 * @param {string} query - Search query to count.
 * @param {string[]|null} [allowedBoorus=null] - Optional booru whitelist.
 * @returns {Promise<number>} Total items count.
 */
export const countImages = async (query = '*', allowedBoorus = null) => {
  /** @type {string} */
  const normalizedQuery = normalizeQueryString(query);
  const whereClause = allowedBoorus ? { booruUrl: { in: allowedBoorus } } : undefined;

  if (normalizedQuery === '*') {
    return await dbConnection.count({
      where: whereClause,
      from: 'Images',
    });
  }

  return await dbConnection.count({
    from: 'Queries',
    where: { query: normalizedQuery, ...whereClause },
  });
};

/**
 * Fetches a single image by its ID, parses it, caches it in the local database, and returns the formatted data.
 * @param {string} booruUrl - Source booru URL.
 * @param {string} apiKey - User API key.
 * @param {number|string} imageId - The target image ID.
 * @returns {Promise<ImageResult|null>} Formatted image data with interaction status.
 */
export const fetchSingleImage = async (booruUrl, apiKey, imageId) => {
  try {
    const result = await fetchPhilomena(booruUrl, `images/${imageId}`, apiKey);
    const ctx = 'Single Image Fetch';

    if (!result.image) throwApiError(ctx, 'image');

    /** @type {ImageObj} */
    const formattedImage = parseImageData(booruUrl, result.image);
    const formattedInteractions = getInteractions(booruUrl, result);

    /** @type {ImageObj} */
    const imageResult = { ...formattedImage };
    // @ts-ignore
    imageResult.interaction =
      formattedInteractions.find((int) => int.imageId === formattedImage.id)?.value ?? null;

    // Restores boolean fields for the React components
    return fixImageObj(imageResult);
  } catch (error) {
    console.error(`Failed to fetch single image ${imageId} from ${booruUrl}:`, error);
    return null;
  }
};

/**
 * Fetches the featured image payload for the given booru URL.
 * @param {string} booruUrl - The booru instance URL.
 * @param {string} apiKey - User authentication key.
 * @returns {Promise<ImageResult | null>} Formatted featured image data.
 */
export const getFeaturedImage = async (booruUrl, apiKey) => {
  try {
    const data = await fetchPhilomena(booruUrl, `images/featured`, apiKey);
    const formattedImage = data.image ? parseImageData(booruUrl, fixImageObj(data.image)) : null;
    if (!formattedImage) return null;

    const formattedInteractions = getInteractions(booruUrl, {
      total: 1,
      interactions: data.interactions,
      images: [data.image],
    });
    if (formattedInteractions.length > 0) {
      await dbConnection.insert({
        into: 'Interactions',
        values: formattedInteractions,
        upsert: true,
      });
    }

    /** @type {ImageResult} */
    // @ts-ignore
    const imageResult = { ...formattedImage };
    imageResult.interaction =
      formattedInteractions.find((int) => int.imageId === formattedImage.id)?.value ?? null;

    return imageResult;
  } catch (error) {
    console.error('Failed to fetch featured image:', error);
    return null;
  }
};

/**
 * Picks a random image from active boorus matching the query, utilizing remote totals for true randomness.
 * @param {Account[]} accounts - List of accounts to choose from.
 * @param {string} [query='*'] - Filter query for randomness.
 * @returns {Promise<ImageResult|null>} A randomly selected image object.
 */
export const randomImage = async (accounts, query = '*') => {
  const allAccounts = !accounts ? await getActiveAccounts() : accounts;
  if (!Array.isArray(allAccounts) || allAccounts.length === 0) return null;

  /** @type {string} */
  const normalizedQuery = normalizeQueryString(query);

  /** @type {{ account: Account, total: number }[]} */
  const validBoorus = [];

  for (const account of allAccounts) {
    try {
      const data = await searchImagesApi(account.booruUrl, account.apiKey, query, 1, 1);
      /** @type {number} */
      const apiTotal = data.total;

      /** @type {TotalImagesCounter[]} */
      const cachedData = await dbConnection.select({
        from: 'TotalImagesCounter',
        where: { id: `${account.booruUrl}_${normalizedQuery}` },
      });

      if (cachedData.length > 0) {
        /** @type {number} */
        const cachedTotal = cachedData[0].total;

        if (apiTotal !== cachedTotal) {
          await dbConnection.update({
            in: 'TotalImagesCounter',
            set: { total: apiTotal, updatedAt: Date.now() },
            where: { id: `${account.booruUrl}_${normalizedQuery}` },
          });
        }
      } else {
        await dbConnection.insert({
          into: 'TotalImagesCounter',
          values: [
            {
              id: `${account.booruUrl}_${normalizedQuery}`,
              booruUrl: account.booruUrl,
              query: normalizedQuery,
              total: apiTotal,
              updatedAt: Date.now(),
            },
          ],
        });
      }

      if (apiTotal > 0) {
        validBoorus.push({ account, total: apiTotal });
      }
    } catch (error) {
      console.error(
        `Failed to fetch and cache total for randomImage on ${account.booruUrl}:`,
        error,
      );
    }
  }

  if (validBoorus.length === 0) return null;

  /** @type {number} */
  const selectedBooruIndex = TinySimpleDice.rollArrayIndex(validBoorus);
  const selectedData = validBoorus[selectedBooruIndex];

  const dice = new TinySimpleDice({ maxValue: selectedData.total, allowZero: false });
  /** @type {number} */
  const selectedImageNumber = dice.roll();

  // Extreme optimization: We take only 1 item (per_page=1) and the page is the number selected
  /** @type {number} */
  const targetPage = selectedImageNumber;
  /** @type {number} */
  const perPage = 1;

  try {
    const result = await searchImagesApi(
      selectedData.account.booruUrl,
      selectedData.account.apiKey,
      query,
      targetPage,
      perPage,
    );

    if (result && Array.isArray(result.images) && result.images.length > 0) {
      const rawImage = result.images[0];

      /** @type {ImageObj} */
      const formattedImage = parseImageData(selectedData.account.booruUrl, rawImage);
      const formattedInteractions = getInteractions(selectedData.account.booruUrl, result);

      /** @type {ImageResult} */
      const imageResult = { ...formattedImage, interaction: null };

      const specificInteraction = formattedInteractions.find(
        (int) => int.imageId === formattedImage.id,
      );

      if (specificInteraction) {
        imageResult.interaction = specificInteraction.value;
      }

      return fixImageObj(imageResult);
    }
  } catch (error) {
    console.error('Failed to fetch the mathematically calculated random image:', error);
  }

  return null;
};

/**
 * Wipes out all cached images, queries, and interaction data.
 * @returns {Promise<void>}
 */
export const clearImageCache = async () => {
  try {
    await dbConnection.clear('Queries');
    await dbConnection.clear('Interactions');
    await dbConnection.clear('Images');
    await dbConnection.clear('TotalImagesCounter');

    // Note: You might want to clear 'Interactions' as well
    // if they are strictly tied to the cached images.

    console.log('Image and Query cache cleared successfully.');
  } catch (error) {
    console.error('Failed to clear image cache:', error);
  }
};
