import TinyPromiseQueue from 'tiny-essentials/libs/utils/TinyPromiseQueue';
import { alert } from 'tiny-essentials/webTemplates/bootstrap/5.3/html/BootstrapDialogs';

import { logger } from '../Console.mjs';
import { fetchProfile } from '../services/api/Profile.js';
import { fetchSingleImage } from '../services/api/Images.js';
import { getAccountBooruApi } from '../services/api/System.js';

export const importantTasks = new TinyPromiseQueue();

/**
 * Function type to update the loading state.
 * @typedef {(isLoading: boolean) => void} SetIsLoading
 */

/**
 * Represents an image object from the API.
 * @typedef {import('../services/api/Images.js').ImageObj} ImageObj
 */

/**
 * Function type to handle opening an image link.
 * @typedef {(img: import('../services/api/Images.js').ImageResult) => void} OnOpenImageLink
 */

/**
 * Fetches image data from a Booru API and executes a callback to open the link.
 * @param {string|number} refId - The reference ID of the image to fetch.
 * @param {SetIsLoading} setIsLoading - Function to toggle the loading state.
 * @param {string} booruUrl - The base URL of the Booru service.
 * @param {OnOpenImageLink} onOpenImageLink - Callback function to handle the fetched image data.
 * @returns {Promise<void>}
 */
export const openImageLink = async (booruUrl, onOpenImageLink, setIsLoading, refId) => {
  setIsLoading(true);
  try {
    const apiKey = await getAccountBooruApi(booruUrl);
    const imgData = await fetchSingleImage(booruUrl, apiKey || '', refId);

    setIsLoading(false);
    if (imgData) {
      onOpenImageLink(imgData);
    } else {
      alert('Image not found or could not be loaded.');
    }
  } catch (err) {
    setIsLoading(false);
    logger.error('Error fetching image link:', err);
    alert('Error fetching image data.');
  }
};

/**
 * Function type to handle opening a profile link.
 * @typedef {(booruUrl: string, username: string, id: number) => void} OnOpenProfileLink
 */

/**
 * Fetches profile data from a Booru API and executes a callback to open the profile.
 * @param {number} matchTarget - The username or target to match the profile.
 * @param {SetIsLoading} setIsLoading - Function to toggle the loading state.
 * @param {OnOpenProfileLink} onOpenProfileLink - Callback function to handle the profile data.
 * @param {string} booruUrl - The base URL of the Booru service.
 * @returns {Promise<void>}
 */
export const openProfileLink = async (booruUrl, onOpenProfileLink, setIsLoading, matchTarget) => {
  setIsLoading(true);
  try {
    const profileData = await fetchProfile(booruUrl, matchTarget);

    setIsLoading(false);
    if (profileData) {
      onOpenProfileLink(booruUrl, profileData.name, profileData.id);
    } else {
      alert('Profile not found or could not be loaded.');
    }
  } catch (err) {
    setIsLoading(false);
    logger.error('Error fetching profile link:', err);
    alert('Error fetching profile data.');
  }
};

/**
 * Updates the content attribute of a specific meta tag if it exists.
 * @param {string} property - The property or name attribute of the meta tag.
 * @param {string} content - The new content value for the meta tag.
 * @returns {void}
 */
const setMetaTag = (property, content) => {
  const element =
    document.querySelector(`meta[property="${property}"]`) ||
    document.querySelector(`meta[name="${property}"]`);

  if (element) {
    element.setAttribute('content', content);
  } else {
    logger.warn(`Meta tag with property/name "${property}" was not found in the document.`);
  }
};

/**
 * Updates multiple Open Graph and Twitter meta tags for social media embeds.
 * @param {Object} data - The metadata information object.
 * @param {string} data.title - The title to be displayed in the embed.
 * @param {string} data.description - The description text for the embed.
 * @param {string} data.image - The absolute URL of the thumbnail image.
 * @param {string} data.url - The canonical URL of the page.
 * @returns {void}
 */
export const updateEmbedMetadata = ({ title, description, image, url }) => {
  setMetaTag('og:title', title);
  setMetaTag('title', title);
  setMetaTag('twitter:title', title);
  setMetaTag('og:description', description);
  setMetaTag('twitter:description', description);
  setMetaTag('description', description);
  setMetaTag('og:image', image);
  setMetaTag('twitter:image', image);
  setMetaTag('og:url', url);
  setMetaTag('twitter:url', url);
};
