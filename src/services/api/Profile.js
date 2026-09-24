import { logger } from '../../Console.mjs';
import { fetchPhilomena, throwApiError } from './Philomena.js';

/**
 * Represents a social or external link attached to a user's profile.
 * @typedef {Object} UserProfileLink
 * @property {string} state The verification state of the link.
 * @property {Date} createdAt The timestamp when the link was created.
 * @property {number} userId The ID of the user who owns the link.
 * @property {number} tagId The ID of the associated tag for this link.
 */

/**
 * Represents a badge or award given to a user.
 * @typedef {Object} UserProfileAward
 * @property {string} imageUrl The URL to the badge icon.
 * @property {Date} awardedOn The date the award was granted.
 * @property {string} title The display title of the award.
 * @property {string|null} label An optional label or description for the award.
 * @property {number} id The unique identifier of the award instance.
 */

/**
 * Contains all parsed and formatted information about a booru user's profile.
 * @typedef {Object} UserProfileData
 * @property {number} id Unique user identifier.
 * @property {number} uploadsCount Total number of images uploaded by the user.
 * @property {number} commentsCount Total number of comments posted.
 * @property {number} postsCount Total number of forum posts.
 * @property {number} topicsCount Total number of forum topics created.
 * @property {string} name The display name of the user.
 * @property {string|null} description The user's profile biography.
 * @property {string} role The administrative or user role level.
 * @property {string} slug The URL-friendly version of the username.
 * @property {string|null} avatarUrl URL to the user's profile picture.
 * @property {Date} createdAt Date when the account was registered.
 * @property {UserProfileLink[]} links List of external social connections.
 * @property {UserProfileAward[]} awards List of badges earned by the user.
 */

/**
 * Fetches and parses a user's profile data from the specified booru.
 * @param {string} booruUrl The base URL of the booru.
 * @param {number|string} userId The ID of the user to retrieve.
 * @returns {Promise<UserProfileData|null>} The formatted profile data or null on failure.
 */
export const fetchProfile = async (booruUrl, userId) => {
  try {
    const result = await fetchPhilomena(booruUrl, `profiles/${userId}`, '');
    if (!result) return null;
    const user = result.user;

    const ctx = 'User Profile';
    if (typeof user.id !== 'number') throwApiError(ctx, 'user.id');
    if (typeof user.uploads_count !== 'number') throwApiError(ctx, 'user.uploads_count');
    if (typeof user.comments_count !== 'number') throwApiError(ctx, 'user.comments_count');
    if (typeof user.posts_count !== 'number') throwApiError(ctx, 'user.posts_count');
    if (typeof user.topics_count !== 'number') throwApiError(ctx, 'user.topics_count');
    if (typeof user.name !== 'string') throwApiError(ctx, 'user.name');
    if (typeof user.description !== 'string' && user.description !== null)
      throwApiError(ctx, 'user.description');
    if (typeof user.role !== 'string') throwApiError(ctx, 'user.role');
    if (typeof user.slug !== 'string') throwApiError(ctx, 'user.slug');
    if (typeof user.avatar_url !== 'string' && user.avatar_url !== null)
      throwApiError(ctx, 'user.avatar_url');
    if (typeof user.created_at !== 'string') throwApiError(ctx, 'user.created_at');
    if (!Array.isArray(user.links)) throwApiError(ctx, 'user.links');
    if (!Array.isArray(user.awards)) throwApiError(ctx, 'user.awards');

    user.created_at = new Date(user.created_at);

    user.links.forEach((link) => {
      if (typeof link.state !== 'string') throwApiError(ctx, 'link.state');
      if (typeof link.created_at !== 'string') throwApiError(ctx, 'link.created_at');
      if (typeof link.user_id !== 'number') throwApiError(ctx, 'link.user_id');
      if (typeof link.tag_id !== 'number') throwApiError(ctx, 'link.tag_id');

      link.createdAt = new Date(link.created_at);
      delete link.created_at;
      link.userId = link.user_id;
      delete link.user_id;
      link.tagId = link.tag_id;
      delete link.tag_id;
    });

    user.awards.forEach((award) => {
      if (typeof award.awarded_on !== 'string') throwApiError(ctx, 'award.awarded_on');
      if (typeof award.image_url !== 'string') throwApiError(ctx, 'award.image_url');
      if (typeof award.title !== 'string') throwApiError(ctx, 'award.title');
      if (typeof award.label !== 'string' && award.label !== null)
        throwApiError(ctx, 'award.label');
      if (typeof award.id !== 'number') throwApiError(ctx, 'award.id');

      award.awardedOn = new Date(award.awarded_on);
      delete award.awarded_on;
      award.imageUrl = award.image_url;
      delete award.image_url;
    });

    return {
      id: user.id,
      uploadsCount: user.uploads_count,
      commentsCount: user.comments_count,
      postsCount: user.posts_count,
      topicsCount: user.topics_count,
      name: user.name,
      description: user.description,
      role: user.role,
      slug: user.slug,
      avatarUrl: user.avatar_url,
      createdAt: user.created_at,
      links: user.links,
      awards: user.awards,
    };
  } catch (error) {
    logger.error('Failed to fetch profile:', error);
    return null;
  }
};
