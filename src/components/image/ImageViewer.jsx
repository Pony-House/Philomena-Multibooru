import { useState, useEffect, useRef } from 'react';
import { shuffleArray } from 'tiny-essentials/basics/array';

import { MediaPlayer, MediaPlayerInstance, MediaProvider } from '@vidstack/react';
import {
  defaultLayoutIcons,
  DefaultVideoLayout,
  DefaultAudioLayout,
} from '@vidstack/react/player/layouts/default';

import { alert } from 'tiny-essentials/webTemplates/bootstrap/5.3/html/BootstrapDialogs';

import { fetchComments, searchImages, syncUserGalleryPages } from '../../services/api/Images.js';
import { getAccountBooruApi } from '../../services/api/System.js';
import { checkLocalFave, toggleLocalFave, updateLocalFave } from '../../services/api/LocalFaves.js';

import { CommentBody } from '../utils/CommentBody.jsx';
import { Loading } from '../utils/Loading.jsx';
import { ProfileLink } from './ProfileLink.jsx';
import { Image } from './ImageGallery.jsx';

import CORE_TAGS from '../../queries/core.js';
import BLACKLIST_TAGS from '../../queries/blacklistTags.js';
import BLACKLIST_PREFIXES from '../../queries/blacklistPrefixes.js';
import tagsPrefixCssList from '../../queries/tagsPrefixCssList.js';
import { parseQueryResults } from '../../queries/globalTags.js';

/**
 * @typedef {import('../../services/api/Images.js').ImageResult} ImageResult
 * @typedef {import('../../services/api/Images.js').CommentData} CommentData
 */

/**
 * Calculates a relative time string (e.g., "11 years ago")
 * @param {Date|number} date
 * @returns {string}
 */
const timeSince = (date) => {
  const seconds = Math.floor(
    (new Date().valueOf() - (date instanceof Date ? date.valueOf() : date)) / 1000,
  );

  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + ' years ago';
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + ' months ago';
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + ' days ago';
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + ' hours ago';
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + ' minutes ago';
  return Math.floor(seconds) + ' seconds ago';
};

/**
 * @param {number} bytes
 * @returns {string}
 */
const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KiB', 'MiB', 'GiB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(0)) + ' ' + sizes[i];
};

/**
 * @param {object} props
 * @param {ImageResult|null} props.image
 * @param {() => void} props.onClose
 * @param {(query: string) => void} props.onSearch
 * @param {(img: ImageResult) => void} props.onOpenImage
 * @param {(booruUrl: string, username: string, id: number) => void} props.onOpenProfile
 * @param {(direction: 'prev'|'next') => Promise<void>} props.onNavigateImage
 */
export const ImageViewer = ({
  image,
  onClose,
  onSearch,
  onOpenProfile,
  onOpenImage,
  onNavigateImage,
}) => {
  /** @type {UseStateTemplate<boolean>} */
  const [isLoading, setIsLoading] = useState(false);

  /** @type {UseStateTemplate<boolean>} */
  const [isNavigating, setIsNavigating] = useState(false);

  /** @type {UseStateTemplate<boolean>} */
  const [isInteractionReady, setIsInteractionReady] = useState(true);

  /** @type {UseStateTemplate<boolean>} */
  const [isZoomed, setIsZoomed] = useState(false);

  /** @type {UseStateTemplate<CommentData[]>} */
  const [comments, setComments] = useState([]);

  /** @type {UseStateTemplate<boolean>} */
  const [isLoadingComments, setIsLoadingComments] = useState(true);

  /** @type {UseStateTemplate<boolean>} */
  const [showShare, setShowShare] = useState(false);

  /** @type {UseStateTemplate<number>} */
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // State to control the loading visual of the main image/video
  /** @type {UseStateTemplate<boolean>} */
  const [isMediaLoaded, setIsMediaLoaded] = useState(false);

  // Recommendations States
  /** @type {UseStateTemplate<ImageResult[]>} */
  const [recommendations, setRecommendations] = useState([]);
  /** @type {UseStateTemplate<boolean>} */
  const [isLoadingRecs, setIsLoadingRecs] = useState(false);
  /** @type {UseStateTemplate<number>} */
  const [recPage, setRecPage] = useState(1);
  /** @type {UseStateTemplate<boolean>} */
  const [hasMoreRecs, setHasMoreRecs] = useState(true);
  /** @type {UseStateTemplate<boolean>} */
  const [isAllowedToFetch, setIsAllowedToFetch] = useState(false);
  /** @type {UseStateTemplate<number>} */
  const [retryRecsCount, setRetryRecsCount] = useState(0);

  // Security Anti-Spam State
  /** @type {UseStateTemplate<boolean>} */
  const [isRateLimited, setIsRateLimited] = useState(false);

  /** @type {Ref<MediaPlayerInstance>} */
  const videoRef = useRef(null);
  /** @type {Ref<HTMLImageElement>} */
  const imgRef = useRef(null);

  /** @type {Ref<string>} */
  const currentRecQuery = useRef('');
  /** @type {Ref<HTMLDivElement|null>} */
  const observerTarget = useRef(null);
  /** @type {Ref<number>} */
  const lastFetchTime = useRef(0); // Tracks the timestamp of the last fetch start
  /** @type {Ref<boolean>} */
  const pendingNavigation = useRef(false);
  /** @type {Ref<number>} */
  const lastNavActionTime = useRef(0); // Security cooldown for keyboard events

  /** @type {UseStateTemplate<boolean>} */
  const [isLocalFaved, setIsLocalFaved] = useState(false);

  /** @type {boolean} */
  const localFavesEnabled = localStorage.getItem('app_localFavesEnabled') === 'true';

  useEffect(() => {
    if (!image) return;
    let isMounted = true;

    /**
     * @returns {Promise<void>}
     */
    const verifyLocalFave = async () => {
      /** @type {boolean} */
      const status = await checkLocalFave(image.id, image.booruUrl);
      if (!isMounted) return;
      setIsLocalFaved(status);
    };

    verifyLocalFave();
    return () => {
      isMounted = false;
    };
  }, [image]);

  useEffect(() => {
    if (!image) return;
    let isMounted = true;

    /**
     * @returns {Promise<void>}
     */
    const verifyAndUpdateLocalFave = async () => {
      /** @type {boolean} */
      const status = await checkLocalFave(image.id, image.booruUrl);
      if (!isMounted) return;
      setIsLocalFaved(status);

      if (status) {
        await updateLocalFave(image);
      }
    };

    verifyAndUpdateLocalFave();
    return () => {
      isMounted = false;
    };
  }, [image]);

  /**
   * @returns {Promise<void>}
   */
  const handleToggleFave = async () => {
    if (!image || !localFavesEnabled) return;
    /** @type {boolean} */
    const newStatus = await toggleLocalFave(image);
    setIsLocalFaved(newStatus);
  };

  // Initial Spoiler check
  const isImageSpoiler = image?.spoilered;

  /** @type {UseStateTemplate<boolean>} */
  const [revealed, setRevealed] = useState(!isImageSpoiler);

  const enableRecs = localStorage.getItem('app_enableRecs') === 'true';
  const recVideoMode = localStorage.getItem('app_recVideoMode') === 'true';
  const recTagLimit = parseInt(localStorage.getItem('app_recTagLimit') || '5', 10);

  const isVideo = image && image.mimeType && image.mimeType.startsWith('video/');
  const imageSrc = image
    ? isZoomed
      ? image.representations.full
      : image.representations.large || image.representations.full
    : '';
  const fileExtension = image
    ? image.format || (image.mimeType ? image.mimeType.split('/')[1] : 'file')
    : '';
  const fileName = image
    ? `${image.id}__${
        image.tags
          ? image.tags
              .slice(0, 3)
              .join('_')
              .replace(/[^a-z0-9_]/gi, '')
          : 'image'
      }.${fileExtension}`
    : '';
  const uploadDate = image ? image.createdAt : new Date();
  const uploaderName = image ? (image.uploader ?? 'Background Pony') : '';

  const plyrAutoplay = localStorage.getItem('app_plyrAutoplay') !== 'false';
  const plyrMuted = localStorage.getItem('app_plyrMuted') !== 'false';
  const plyrLoop = localStorage.getItem('app_plyrLoop') !== 'false';
  const plyrHideControls = localStorage.getItem('app_plyrHideControls') !== 'false';
  const plyrStorage = localStorage.getItem('app_plyrStorage') === 'true';

  // Smart Auto Refresh Listener
  useEffect(() => {
    const onRefresh = () => setRefreshTrigger((prev) => prev + 1);
    window.addEventListener('appFocusRefresh', onRefresh);
    return () => window.removeEventListener('appFocusRefresh', onRefresh);
  }, []);

  // Quick Navigation Handler
  const handleNavigation = async (dir) => {
    if (isNavigating) return;
    setIsNavigating(true);
    pendingNavigation.current = true;
    await onNavigateImage(dir);
    setIsNavigating(false);
  };

  // Setup Keyboard Shortcuts for Fast Navigation
  useEffect(() => {
    /**
     * @param {KeyboardEvent} e
     */
    const handleKeyDown = (e) => {
      // Ignore key events originating from form elements like <input> or <textarea>
      if (
        e.target instanceof HTMLElement &&
        (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')
      )
        return;

      // Listen for the ESC key to close the viewer
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      const now = Date.now();
      // Security: 800ms debounce for navigation keys to prevent glitches
      if (now - lastNavActionTime.current < 500) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        lastNavActionTime.current = now;
        handleNavigation('prev');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        lastNavActionTime.current = now;
        handleNavigation('next');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [image?.id, isNavigating, onClose]);

  // Reset Core States When a New Image is Loaded
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMediaLoaded(false);
    setRecommendations([]);
    setRecPage(1);
    setHasMoreRecs(true);
    setIsAllowedToFetch(false);
    setIsRateLimited(false);
    setIsLoadingRecs(false);
    currentRecQuery.current = '';
    lastFetchTime.current = 0;

    // Fix 1: Re-evaluate the spoiler state for the new image safely
    const isImgSpoiler = image?.spoilered;
    setRevealed(!isImgSpoiler);

    // Checks if we got here via quick navigation to engage the Lazy Load lock
    if (pendingNavigation.current) {
      setIsInteractionReady(false);
      pendingNavigation.current = false;
    } else {
      setIsInteractionReady(true);
    }

    // Detect content loaded
    if (imgRef.current && imgRef.current.complete) {
      setIsMediaLoaded(true);
    }
  }, [image?.id, image?.spoilered]);

  useEffect(() => {
    if (videoRef.current && !isMediaLoaded) {
      const player = videoRef.current;
      const checkMediaStatus = () => {
        // Exists video
        if (!videoRef.current) return;

        // Exists provider
        /** @type {import('@vidstack/react').VideoProvider} */
        // @ts-ignore
        const provider = videoRef.current?.provider;
        if (!provider) return;

        // Exists media
        const media = provider?.media;
        if (!(media instanceof HTMLMediaElement)) return;

        // Player is ready
        if (media.readyState >= 3) setIsMediaLoaded(true);
        player.removeEventListener('provider-change', checkMediaStatus);
      };

      // Video event checker
      player.addEventListener('provider-change', checkMediaStatus);
      return () => {
        player.removeEventListener('provider-change', checkMediaStatus);
      };
    }
  }, [image?.id, image?.spoilered]);

  // Interaction Unlocker for Lazy Loading network-heavy tasks
  useEffect(() => {
    if (isInteractionReady) return;

    const unlock = () => {
      const now = Date.now();
      // Security: 800ms debounce for navigation keys to prevent glitches
      if (now - lastNavActionTime.current < 500) return;
      setIsInteractionReady(true);
    };

    const options = { capture: true, passive: true };
    window.addEventListener('scroll', unlock, options);
    window.addEventListener('wheel', unlock, options);

    return () => {
      window.removeEventListener('scroll', unlock, options);
      window.removeEventListener('wheel', unlock, options);
    };
  }, [isInteractionReady]);

  // Fetch Comments (Lazy Loaded via isInteractionReady)
  useEffect(() => {
    if (!isInteractionReady || !image) return;

    const controller = new AbortController();
    let isMounted = true;

    const getComments = async () => {
      setIsLoadingComments(true);
      try {
        const data = await fetchComments(
          image.booruUrl,
          await getAccountBooruApi(image.booruUrl),
          `image_id:${image.id}`,
          1,
          controller.signal,
        );
        if (isMounted) setComments(data.comments || []);
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Failed to fetch comments:', err);
        }
      } finally {
        if (isMounted) setIsLoadingComments(false);
      }
    };

    getComments();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [image, refreshTrigger, isInteractionReady]);

  // Focus and visibility trigger check
  useEffect(() => {
    if (!enableRecs || !image) return;

    const checkFocus = () => {
      if (!document.hidden && document.hasFocus()) {
        setIsAllowedToFetch(true);
      }
    };

    if (!document.hidden && document.hasFocus()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsAllowedToFetch(true);
    } else {
      window.addEventListener('focus', checkFocus);
      document.addEventListener('visibilitychange', checkFocus);
    }

    return () => {
      window.removeEventListener('focus', checkFocus);
      document.removeEventListener('visibilitychange', checkFocus);
    };
  }, [image?.id, enableRecs]);

  // Retry Mechanism for Recommendations
  const handleRetryRecs = () => {
    setHasMoreRecs(true);
    setRecPage(1);
    currentRecQuery.current = ''; // Clear query forces useEffect to draw new tags!
    setRecommendations([]);
    setIsRateLimited(false);
    setRetryRecsCount((prev) => prev + 1);
  };

  // Fetch Recommendations using Multi-Booru Search
  useEffect(() => {
    if (!isInteractionReady) return;

    let isMounted = true;
    const controller = new AbortController();

    /**
     * Internal function to load image recommendations with smart filtering
     */
    const loadRecommendations = async () => {
      if (!image || !enableRecs || !hasMoreRecs || !isAllowedToFetch || isRateLimited) return;
      setIsLoadingRecs(true);
      lastFetchTime.current = Date.now(); // Record the exact moment the API request starts

      try {
        // Generate query ONLY on the first page to keep pagination stable
        if (recPage === 1 && !currentRecQuery.current) {
          /** @type {string[]} */
          const allTags = image.tags || [];

          // 1. Extract rating tags (Static)
          /** @type {string[]} */
          const staticRatings = allTags.filter((tag) =>
            CORE_TAGS.includes(tag.toLowerCase().trim()),
          );

          // 2. Filter out blacklisted metadata tags and ratings to get pure content
          /** @type {string[]} */
          const contentTags = allTags.filter((tag) => {
            /** @type {string} */
            const lowerTag = tag.toLowerCase().trim();
            /** @type {boolean} */
            const isRating = CORE_TAGS.includes(lowerTag);
            /** @type {boolean} */
            const isBlacklisted =
              BLACKLIST_PREFIXES.some((prefix) => lowerTag.startsWith(prefix)) ||
              BLACKLIST_TAGS.some((tag) => lowerTag === tag);

            return !isRating && !isBlacklisted;
          });

          // 3. Shuffle and pick content tags for the "OR" group
          /** @type {string[]} */
          const selectedContent = shuffleArray(contentTags).slice(0, recTagLimit);

          /** @type {string[]} */
          let queryParts = [];

          // Add ratings (AND)
          if (staticRatings.length > 0) queryParts.push(staticRatings.join(', '));

          // Add content group (OR)
          if (selectedContent.length > 0) queryParts.push(`(${selectedContent.join(' OR ')})`);

          // Global filters
          queryParts.push(
            `first_seen_at.gt:${parseInt(localStorage.getItem('app_recDaysLimit') || '3')} days ago`,
          );
          if (recVideoMode) queryParts.push('video');

          // The comma between static ratings and the OR group acts as AND
          currentRecQuery.current = queryParts.join(', ');
        }

        // Fetching from all active boorus selected by the user
        const activeBoorus = JSON.parse(localStorage.getItem('app_visibleBoorus') || '[]');
        if (activeBoorus.length === 0) activeBoorus.push(image.booruUrl);

        await syncUserGalleryPages({
          query: parseQueryResults(currentRecQuery.current),
          limit: 20,
          page: recPage,
          allowedBoorus: activeBoorus,
          sd: 'desc',
          sf: 'wilson_score',
        });

        const data = await searchImages({
          query: parseQueryResults(currentRecQuery.current),
          limit: 20,
          page: recPage,
          allowedBoorus: activeBoorus,
          sd: 'desc',
          sf: 'wilson_score',
        });

        if (isMounted && data) {
          // If the API returns less than requested, we reached the end
          if (data.length < 20) setHasMoreRecs(false);

          // Filter out the exact image being viewed to avoid self-recommendation
          let formatted = data.filter(
            (img) => !(img.id === image.id && img.booruUrl === image.booruUrl),
          );

          // Shuffle the newly fetched batch so the grid looks organic
          formatted = shuffleArray(formatted);

          setRecommendations((prev) => {
            // Using composite key (booruUrl + id) to prevent dupes across platforms
            /** @type {Set<string>} */
            const prevIds = new Set(prev.map((p) => `${p.booruUrl}_${p.id}`));
            /** @type {ImageResult[]} */
            const uniqueNew = formatted.filter((f) => !prevIds.has(`${f.booruUrl}_${f.id}`));
            return [...prev, ...uniqueNew];
          });
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Failed to fetch recommendations:', err);
          if (isMounted) setHasMoreRecs(false); // Stop trying if the API fails
        }
      } finally {
        if (isMounted) setIsLoadingRecs(false);
      }
    };

    loadRecommendations();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [image, enableRecs, isAllowedToFetch, recPage, isInteractionReady, retryRecsCount]);

  // Infinite Scroll Observer for Recommendations with Anti-Spam protection
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMoreRecs &&
          !isLoadingRecs &&
          isAllowedToFetch &&
          !isRateLimited
        ) {
          const now = Date.now();

          // Anti-Spam Protection: If this trigger happens less than 2000ms after the last fetch started, lock it.
          if (lastFetchTime.current > 0 && now - lastFetchTime.current < 2000) {
            console.warn(
              '⚠️ Security Lock: API request spam detected in recommendations. Infinite scroll paused.',
            );
            setIsRateLimited(true);
            setHasMoreRecs(false);
            return;
          }

          setRecPage((prev) => prev + 1);
        }
      },
      { threshold: 0.1 },
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [hasMoreRecs, isLoadingRecs, isAllowedToFetch, isRateLimited]);

  if (!image) {
    return (
      <div className="container mt-5 fade-in">
        <button onClick={onClose} className="btn btn-secondary mb-4">
          &laquo; Back
        </button>
        <div className="alert alert-danger text-center shadow-sm">
          <h4 className="alert-heading">User not found</h4>
          <p>We couldn't retrieve the image. They might not exist or the API is unavailable.</p>
        </div>
      </div>
    );
  }

  /**
   * Formats tags according to Philomena's URL standards.
   * @param {string[]} tags
   * @returns {string}
   */
  const formatPhilomenaTags = (tags) => {
    return tags
      .map((tag) => tag.toLowerCase().trim().replace(/\s+/g, '+').replace(/:/g, '-colon-'))
      .join('_');
  };

  /**
   * @param {string} url
   * @returns {string}
   */
  const getDownloadUrl = (url) => {
    return url.replace('/img/view/', '/img/download/');
  };

  /**
   * Generates a full download URL with ID and tags.
   * @param {string} url
   * @param {string[]} tags
   * @returns {string}
   */
  const getFullDownloadUrl = (url, tags) => {
    /** @type {string} */
    const baseSwapped = getDownloadUrl(url);

    // Separate the extension from the path
    /** @type {number} */
    const lastDotIndex = baseSwapped.lastIndexOf('.');
    /** @type {string} */
    const extension = baseSwapped.substring(lastDotIndex);
    /** @type {string} */
    const pathWithoutExt = baseSwapped.substring(0, lastDotIndex);

    // Isolate the ID
    /** @type {string[]} */
    const pathParts = pathWithoutExt.split('/');
    /** @type {string} */
    const id = pathParts.pop();
    /** @type {string} */
    const baseUrl = pathParts.join('/');

    /** @type {string} */
    const slug = formatPhilomenaTags(tags);

    // Pattern: {base}/{id}__{tags}.{ext}
    return `${baseUrl}/${id}__${slug}${extension}`;
  };

  /**
   * @param {string} downloadUrl
   * @returns {void}
   */
  const handleDownloadTemplate = (downloadUrl) => {
    /** @type {HTMLAnchorElement} */
    const link = document.createElement('a');

    link.href = downloadUrl;
    link.download = fileName;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /**
   * @returns {void}
   */
  const handleDownloadWithTags = () =>
    handleDownloadTemplate(getFullDownloadUrl(image.representations.full, image.tags));

  /**
   * @returns {void}
   */
  const handleDownload = () => handleDownloadTemplate(getDownloadUrl(image.representations.full));

  /**
   * @param {string} text
   * @returns {void}
   */
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  /**
   * @param {string} tag
   * @returns {string}
   */
  const getTagClass = (tag) => {
    const extraTag = tagsPrefixCssList.find((i) => tag.startsWith(i.prefix));
    return `tag-${tag
      .replace(/[^a-zA-Z\s:]/g, '')
      .replace(/:/g, '-')
      .replace(/\s+/g, '-')
      .toLowerCase()
      .trim()}${extraTag ? ` tag-${extraTag.className}` : ''}`;
  };

  /**
   * @param {import('react').MouseEvent} e
   * @param {string} booruUrl
   * @param {string} username
   * @param {number} id
   */
  const handleProfileClick = (e, booruUrl, username, id) => {
    if (localStorage.getItem('app_inAppProfileViewer') === 'true') {
      e.preventDefault();
      onOpenProfile(booruUrl, username, id);
    }
  };

  const sources = image.sourceUrls ? image.sourceUrls : image.sourceUrl ? [image.sourceUrl] : [];

  const bbcodeFull = `[img]${image.representations.full}[/img]\n[url=${image.booruUrl}/images/${image.id}]View on Booru[/url] - [url=${sources[0] || ''}]Original source[/url]`;
  const bbcodeThumb = `[url=${image.booruUrl}/images/${image.id}][img]${image.representations.thumb}[/img][/url]\n[url=${image.booruUrl}/images/${image.id}]View on Booru[/url] - [url=${sources[0] || ''}]Original source[/url]`;

  const isFav = image.interaction === 'faved';
  const isUp = isFav || image.interaction === 'upVote';
  const isDown = !isFav && image.interaction === 'downVote';

  const faveBackground =
    isFav && isLocalFaved
      ? 'var(--fave-color)'
      : isFav
        ? 'var(--fave-color)'
        : isLocalFaved
          ? 'var(--local-fave-color)'
          : null;

  const faveText = `${isFav && isLocalFaved ? '★ [B]' : isLocalFaved ? '★ [L]' : '★'} ${image.faves}`;

  return (
    <div className="fade-in position-relative">
      {/* Global Loading Overlay for general application state */}
      {(isLoading || isNavigating) && <Loading />}

      {/* Top Toolbar */}
      <div className="viewer-toolbar d-flex flex-wrap align-items-center px-3 py-1 gap-3">
        {/* Quick Navigation and Back controls */}
        <div className="ms-auto d-flex gap-1 align-items-center">
          <button
            onClick={() => handleNavigation('prev')}
            className="btn-tool fw-bold px-3 py-1"
            disabled={isNavigating}
            title="Previous (Left Arrow)"
          >
            &lt;
          </button>
          <button onClick={onClose} className="btn-tool px-3 py-1 fw-bold" title="Back to Gallery">
            Back
          </button>
          <button
            onClick={() => handleNavigation('next')}
            className="btn-tool fw-bold px-3 py-1"
            disabled={isNavigating}
            title="Next (Right Arrow)"
          >
            &gt;
          </button>
        </div>

        <div className="d-flex align-items-center gap-3 ms-1 fw-bold">
          {localFavesEnabled ? (
            <button
              className={`active-fave btn-tool fw-bold border-0 p-0 m-0 px-2${isFav || isLocalFaved ? ' rounded' : ''}`}
              style={{
                backgroundColor: faveBackground,
                color: '#fff',
              }}
              onClick={handleToggleFave}
              title={localFavesEnabled ? 'Click to toggle Local Fave' : 'Favorites'}
            >
              {faveText}
            </button>
          ) : (
            <span
              className={`active-fave${isFav || isLocalFaved ? ' px-2 rounded' : ''}`}
              style={
                isFav || isLocalFaved ? { backgroundColor: faveBackground, color: '#fff' } : null
              }
            >
              {faveText}
            </span>
          )}
          <span
            className={`active-up${isUp ? ' px-2 rounded' : ''}`}
            style={isUp ? { backgroundColor: 'var(--upvote-color)', color: '#fff' } : null}
          >
            ↑ {image.upvotes}
          </span>
          <span>{image.upvotes - image.downvotes}</span>
          <span
            className={`active-down${isDown ? ' px-2 rounded' : ''}`}
            style={isDown ? { backgroundColor: 'var(--downvote-color)', color: '#fff' } : null}
          >
            ↓ {image.downvotes}
          </span>
          <span>💬 {image.commentCount || comments.length}</span>
        </div>

        <div className="me-auto d-flex flex-wrap gap-1">
          <a
            href={`${image.booruUrl}/${image.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-tool"
          >
            👁 View on Booru
          </a>
          <button
            onClick={handleDownloadWithTags}
            rel="nofollow"
            title="Download (tags in filename)"
            className="btn-tool"
          >
            ⬇ Download
          </button>
          <button
            onClick={handleDownload}
            rel="nofollow"
            title="View (no tags in filename)"
            className="btn-tool"
          >
            ⬇ DS
          </button>
        </div>
      </div>

      {/* Sub-info bar */}
      <div className="viewer-subinfo border-bottom" style={{ borderColor: 'var(--app-border)' }}>
        Uploaded {timeSince(uploadDate)} by{' '}
        <strong>
          {image.uploaderId ? (
            <ProfileLink
              booruUrl={image.booruUrl}
              username={uploaderName}
              userId={image.uploaderId}
              className="btn-tool"
              onClick={(e) =>
                handleProfileClick(e, image.booruUrl, image.uploader, image.uploaderId)
              }
              openProfile={(booruUrl, username, id) => onOpenProfile(booruUrl, username, id)}
            >
              {uploaderName}
            </ProfileLink>
          ) : (
            <span className="px-2">{uploaderName}</span>
          )}
        </strong>{' '}
        {image.width}x{image.height} {fileExtension.toUpperCase()} {formatBytes(image.size)} in{' '}
        {new URL(image.booruUrl).hostname}
      </div>

      {/* Image Area */}
      <div
        key={image.id}
        className="position-relative d-flex justify-content-center align-items-center bg-black mb-4 mx-auto shadow-sm"
        style={{
          filter: revealed ? 'none' : 'blur(100px)',
          transition: 'filter 0.3s ease',
          minHeight: '400px',
          cursor: isVideo ? 'default' : isZoomed ? 'zoom-out' : 'zoom-in',
          borderBottom: '1px solid #111',
        }}
        onClick={(e) => {
          if (!revealed) {
            e.preventDefault();
            e.stopPropagation();
            setRevealed(true);
          } else if (!isVideo) setIsZoomed(!isZoomed);
        }}
      >
        {/* Visual Loading State overlay for the media box */}
        {!isMediaLoaded && (
          <div
            className="position-absolute top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center bg-black"
            style={{ zIndex: 5 }}
          >
            <div className="spinner-border text-primary" role="status"></div>
          </div>
        )}

        {isVideo ? (
          <MediaPlayer
            ref={videoRef}
            className="booru-video-player"
            src={image.representations.full}
            onCanPlay={() => setIsMediaLoaded(true)}
            onCanPlayThrough={() => setIsMediaLoaded(true)}
            style={{ opacity: isMediaLoaded ? 1 : 0, transition: 'opacity 0.2s ease-in' }}
            autoPlay={plyrAutoplay}
            loop={plyrLoop}
            muted={plyrMuted}
            storage={plyrStorage ? 'media-player' : null}
            hideControlsOnMouseLeave={plyrHideControls}
          >
            <MediaProvider />
            {/* Layouts */}
            <DefaultAudioLayout icons={defaultLayoutIcons} />
            <DefaultVideoLayout icons={defaultLayoutIcons} />
          </MediaPlayer>
        ) : (
          <img
            ref={imgRef}
            src={imageSrc}
            alt={image.tags?.join(', ')}
            onLoad={() => setIsMediaLoaded(true)}
            style={{
              maxWidth: '100%',
              maxHeight: isZoomed ? 'none' : '85vh',
              objectFit: 'contain',
              transition: 'max-height 0.2s ease-in-out, opacity 0.2s ease-in',
              opacity: isMediaLoaded ? 1 : 0,
            }}
          />
        )}
        {!revealed && (
          <div
            className="position-absolute top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.4)', cursor: 'pointer', zIndex: 10 }}
            onClick={() => setRevealed(true)}
            title="Click to reveal spoiler"
          >
            <span className="badge bg-danger fs-6 fw-bold shadow-sm">
              <i className="bi bi-eye-slash me-1"></i>Spoiler
            </span>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div
        className="container-fluid"
        style={{ maxWidth: enableRecs ? '1600px' : '980px', transition: 'max-width 0.3s ease' }}
      >
        <div className={`row justify-content-center ${enableRecs ? 'g-4' : ''}`}>
          {/* Main Left Content */}
          <div className={enableRecs ? 'col-12 col-md-9' : 'col-12'}>
            {/* Lazy Load Block Visual (shows if the user fast-navigated and hasn't interacted yet) */}
            {!isInteractionReady && (
              <div
                className="alert text-center fw-bold shadow-sm border-0 d-flex flex-column justify-content-center"
                style={{
                  backgroundColor: 'var(--app-surface)',
                  color: 'var(--app-text-muted)',
                  minHeight: '200px',
                  borderLeft: '4px solid var(--app-primary) !important',
                }}
              >
                <div className="mb-2 fs-3">
                  <i className="bi bi-mouse3"></i>
                </div>
                <div>Extra details are paused during quick navigation.</div>
                <div className="small fw-normal mt-1">Scroll to load comments and tags!</div>
              </div>
            )}

            {isInteractionReady && (
              <>
                {/* Description Panel */}
                <div className="philo-panel">
                  <div className="philo-panel-header">📄 Description</div>
                  <div className="philo-panel-body text-muted p-2">
                    {image.description ? (
                      <CommentBody
                        body={image.description}
                        booruUrl={image.booruUrl}
                        imageId={image.id}
                        imageReps={image.representations}
                        onOpenProfileLink={onOpenProfile}
                        onOpenImageLink={onOpenImage}
                        setIsLoading={setIsLoading}
                      />
                    ) : (
                      <i>No description provided.</i>
                    )}
                  </div>
                </div>

                {/* Tags Panel */}
                <div className="philo-panel">
                  <div className="philo-panel-header">
                    🏷️ Tags{' '}
                    <a
                      className="text-muted ms-auto fw-normal text-sm"
                      href={`${image.booruUrl}/images/${image.id}/tag_changes`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      History ({image.tags?.length || 0} tags)
                    </a>
                  </div>
                  <div className="philo-panel-body p-2">
                    <div className="philo-tag-container">
                      {image.tags?.map((tag, idx) => (
                        <div
                          key={idx}
                          className={`philo-tag ${getTagClass(tag)}`}
                          style={{ cursor: 'pointer' }}
                          onClick={() => onSearch(tag)}
                          title={`Search for ${tag}`}
                        >
                          <span className={'philo-tag-name'}>{tag}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Source Panel */}
                <div className="philo-panel">
                  <div className="philo-panel-header">🔗 Sources</div>
                  <div className="philo-panel-body p-2">
                    {sources.length > 0 ? (
                      sources.map((sourceUrl, i) => (
                        <a
                          key={i}
                          href={sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="d-block text-truncate"
                        >
                          {sourceUrl}
                        </a>
                      ))
                    ) : (
                      <i className="text-muted">No source provided.</i>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="d-flex gap-2 mb-4">
                  <a
                    className="btn btn-sm btn-secondary fw-bold px-3"
                    href={`${image.booruUrl}/images/${image.id}/reports/new`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    ⚠️ Report
                  </a>
                  <button
                    className={`btn btn-sm fw-bold px-3 ${showShare ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setShowShare(!showShare)}
                  >
                    ➡️ Share
                  </button>
                </div>

                {/* Share Panel */}
                {showShare && (
                  <div className="philo-panel mb-4 shadow-sm">
                    <div className="philo-panel-body p-2">
                      <div className="mb-3 d-flex align-items-center">
                        <label className="fw-bold me-2" style={{ width: '120px' }}>
                          Small thumbnail
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-sm me-2 bg-dark text-light border-secondary"
                          value={`>>${image.id}s`}
                          readOnly
                        />
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => copyToClipboard(`>>${image.id}s`)}
                        >
                          📋 Copy
                        </button>
                      </div>
                      <div className="mb-3 d-flex align-items-center">
                        <label className="fw-bold me-2" style={{ width: '120px' }}>
                          Thumbnail
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-sm me-2 bg-dark text-light border-secondary"
                          value={`>>${image.id}t`}
                          readOnly
                        />
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => copyToClipboard(`>>${image.id}t`)}
                        >
                          📋 Copy
                        </button>
                      </div>
                      <div
                        className="mb-4 d-flex align-items-center border-bottom pb-4"
                        style={{ borderColor: '#333' }}
                      >
                        <label className="fw-bold me-2" style={{ width: '120px' }}>
                          Preview
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-sm me-2 bg-dark text-light border-secondary"
                          value={`>>${image.id}p`}
                          readOnly
                        />
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => copyToClipboard(`>>${image.id}p`)}
                        >
                          📋 Copy
                        </button>
                      </div>

                      <h6 className="fw-normal mb-3">BBCode</h6>
                      <div className="mb-3">
                        <div className="d-flex justify-content-between mb-1">
                          <label className="fw-bold fs-6">Full size BBCode</label>
                          <button
                            className="btn btn-sm btn-link text-decoration-none text-muted p-0"
                            onClick={() => copyToClipboard(bbcodeFull)}
                          >
                            📋 Copy
                          </button>
                        </div>
                        <textarea
                          className="form-control form-control-sm bg-dark text-light border-secondary"
                          rows={3}
                          readOnly
                          value={bbcodeFull}
                        ></textarea>
                      </div>
                      <div className="mb-2">
                        <div className="d-flex justify-content-between mb-1">
                          <label className="fw-bold fs-6">Thumbnailed BBCode</label>
                          <button
                            className="btn btn-sm btn-link text-decoration-none text-muted p-0"
                            onClick={() => copyToClipboard(bbcodeThumb)}
                          >
                            📋 Copy
                          </button>
                        </div>
                        <textarea
                          className="form-control form-control-sm bg-dark text-light border-secondary"
                          rows={3}
                          readOnly
                          value={bbcodeThumb}
                        ></textarea>
                      </div>
                    </div>
                  </div>
                )}

                {/* Comments Section */}
                <div
                  className="d-flex align-items-center mb-3 border-bottom pb-2"
                  style={{ borderColor: 'var(--app-border)' }}
                >
                  <h5 className="fw-bold mb-0 me-3">{comments.length} comments posted</h5>
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setRefreshTrigger((prev) => prev + 1)}
                  >
                    🔄 Refresh
                  </button>
                </div>

                {isLoadingComments ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary" role="status"></div>
                  </div>
                ) : comments.length === 0 ? (
                  <div className="text-center">No comments yet.</div>
                ) : (
                  <div className="d-flex flex-column gap-3">
                    {comments.map((comment) => (
                      <div
                        key={comment.id}
                        className="philo-panel mb-0 d-flex flex-column flex-sm-row p-3"
                      >
                        {/* Avatar Left Box */}
                        <div
                          className="me-3 mb-2 mb-sm-0 text-center"
                          style={{ width: '80px', flexShrink: 0 }}
                        >
                          <div
                            className="bg-secondary rounded mb-1"
                            style={{
                              width: '80px',
                              height: '80px',
                              backgroundImage: `url(${comment.avatar})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                            }}
                          ></div>
                        </div>

                        {/* Comment Content */}
                        <div className="flex-grow-1">
                          <div className="d-flex justify-content-between border-bottom pb-1 mb-2">
                            <span className="fw-bold fs-5" style={{ color: 'var(--app-text)' }}>
                              {comment.userId ? (
                                <ProfileLink
                                  booruUrl={image.booruUrl}
                                  username={comment.author}
                                  userId={comment.userId}
                                  onClick={(e) =>
                                    handleProfileClick(
                                      e,
                                      image.booruUrl,
                                      comment.author,
                                      comment.userId,
                                    )
                                  }
                                  openProfile={(booruUrl, username, id) =>
                                    onOpenProfile(booruUrl, username, id)
                                  }
                                >
                                  {comment.author}
                                </ProfileLink>
                              ) : (
                                (comment.author ?? 'Anonymous')
                              )}
                            </span>
                          </div>
                          <div className="mb-3" style={{ fontSize: '0.95rem' }}>
                            <CommentBody
                              body={comment.body}
                              booruUrl={image.booruUrl}
                              imageId={image.id}
                              imageReps={image.representations}
                              onOpenProfileLink={onOpenProfile}
                              onOpenImageLink={onOpenImage}
                              setIsLoading={setIsLoading}
                            />
                          </div>
                          <div
                            className="d-flex justify-content-between text-muted"
                            style={{ fontSize: '0.75rem' }}
                          >
                            <div>
                              Posted {timeSince(comment.createdAt)}
                              <br />
                              <a
                                href={`${image.booruUrl}/images/${image.id}/comments/${comment.id}/reports/new`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted text-decoration-none"
                              >
                                ⚑ Report
                              </a>
                            </div>
                            <div className="d-flex align-items-end gap-2">
                              <a
                                href={`${image.booruUrl}/images/${image.id}#comment_${comment.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted text-decoration-none"
                              >
                                🔗 Link
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right Sidebar: Recommendations */}
          {enableRecs && (
            <div className="col-12 col-md-2 d-flex flex-column gap-3">
              <h5
                className="fw-bold mb-0 border-bottom pb-2"
                style={{ borderColor: 'var(--app-border)' }}
              >
                You may also like...
              </h5>

              {!isInteractionReady ? (
                <div
                  className="text-muted text-center p-3 border rounded border-dashed"
                  style={{ borderColor: 'var(--app-border)' }}
                >
                  Waiting for interaction...
                </div>
              ) : isLoadingRecs && recommendations.length === 0 ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status"></div>
                </div>
              ) : recommendations.length === 0 ? (
                <div className="d-flex flex-column gap-2">
                  <div
                    className="text-muted text-center p-3 border rounded border-dashed"
                    style={{ borderColor: 'var(--app-border)' }}
                  >
                    No similar recommendations found right now.
                  </div>
                  {/* Fix 2: Button to try to search again by image new tags from the original image */}
                  <button
                    className="btn btn-sm btn-outline-primary fw-bold"
                    onClick={handleRetryRecs}
                  >
                    🔄 Try Again
                  </button>
                </div>
              ) : (
                <div className="row row-cols-2 row-cols-lg-1 g-3">
                  {recommendations.map((recImg) => (
                    <div key={`${recImg.booruUrl}_${recImg.id}`}>
                      <Image img={recImg} onOpenImage={onOpenImage} />
                    </div>
                  ))}
                </div>
              )}

              {/* Security Alert if Rate Limited */}
              {isRateLimited && isInteractionReady && (
                <div
                  className="alert p-3 mb-0 rounded shadow-sm border-0 mt-3"
                  style={{
                    backgroundColor: 'var(--app-surface)',
                    color: 'var(--app-text)',
                    borderLeft: '4px solid #dc3545 !important',
                  }}
                >
                  <div className="d-flex flex-column text-center">
                    <h6 className="fw-bold text-danger mb-2">
                      <i className="fa-solid fa-shield-halved me-2"></i>Security Lock
                    </h6>
                    <span className="small fw-semibold text-muted">
                      Auto-load disabled to prevent API spam. Your screen resolution triggered the
                      anti-spam protection.
                    </span>
                  </div>
                </div>
              )}

              {/* Infinite Scroll Trigger Element */}
              {hasMoreRecs &&
                !isRateLimited &&
                recommendations.length > 0 &&
                isInteractionReady && (
                  <div ref={observerTarget} className="text-center py-3 w-100 mt-2">
                    {isLoadingRecs ? (
                      <div
                        className="spinner-border text-primary spinner-border-sm"
                        role="status"
                      ></div>
                    ) : (
                      <span className="text-muted small fw-semibold">Scroll for more...</span>
                    )}
                  </div>
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
