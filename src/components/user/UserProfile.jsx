import { useState, useEffect, useRef } from 'react';

import { fetchProfile } from '../../services/api/Profile.js';
import { fetchComments, searchImages, syncUserGalleryPages } from '../../services/api/Images.js';
import { getAccountBooru } from '../../services/api/System.js';

import { Image } from '../image/ImageGallery.jsx';
import { ProfileLink } from '../image/ProfileLink.jsx';
import { CommentBody } from '../utils/CommentBody.jsx';
import { openImageLink } from '../../tools/utils.js';
import { parseQueryResults } from '../../queries/globalTags.js';

/**
 * @template T
 * @typedef {import('react').SetStateAction<T>} SetStateAction
 */

/**
 * @template T
 * @typedef {import('react').Dispatch<T>} Dispatch
 */

/**
 * @template T
 * @typedef {import('react').Ref<T>} Ref
 */

/**
 * @typedef {import('../../services/api/Profile.js').UserProfileData} UserProfileData
 * @typedef {import('../../services/api/Images.js').ImageResult} ImageResult
 * @typedef {import('../../services/api/Images.js').CommentData} CommentData
 */

/**
 * @param {Date|string} date
 * @returns {string}
 */
const timeSince = (date) => {
  const d = new Date(date).valueOf();
  const seconds = Math.floor((new Date().valueOf() - d) / 1000);
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
 * @param {{ booruUrl: string, username: string, userId: number, handleQuickLinkClick: import('../../App.jsx').HandleQuickLinkClick, onClose: () => void, onOpenImage: (img: ImageResult) => void, onOpenProfile: (booruUrl: string, username: string, id: number) => void }} props
 */
export const UserProfile = ({
  booruUrl,
  userId,
  username,
  onClose,
  onOpenImage,
  onOpenProfile,
  handleQuickLinkClick,
}) => {
  /** @type {UseStateTemplate<UserProfileData|null>} */
  const [pf, setProfile] = useState(null);

  /** @type {UseStateTemplate<boolean>} */
  const [isLoading, setIsLoading] = useState(true);

  /** @type {UseStateTemplate<ImageResult[]>} */
  const [recentUploads, setRecentUploads] = useState([]);

  /** @type {UseStateTemplate<ImageResult[]>} */
  const [recentFaves, setRecentFaves] = useState([]);

  /** @type {UseStateTemplate<CommentData[]>} */
  const [recentComments, setRecentComments] = useState([]);

  /** @type {UseStateTemplate<number>} */
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  /** @type {Ref<{ url: string|null, id: number|null, trigger: number|null, isMounted: boolean|null }>} */
  const lastFetched = useRef({ url: null, id: null, trigger: null, isMounted: null });

  // Smart Auto Refresh Listener
  useEffect(() => {
    const onRefresh = () => setRefreshTrigger((prev) => prev + 1);
    window.addEventListener('appFocusRefresh', onRefresh);
    return () => window.removeEventListener('appFocusRefresh', onRefresh);
  }, []);

  useEffect(() => {
    const loadCache = { isMounted: true, url: booruUrl, id: userId, trigger: refreshTrigger };
    // Prevent duplicate firing in React Strict Mode
    const isTheSame =
      lastFetched.current.url === booruUrl &&
      lastFetched.current.id === userId &&
      lastFetched.current.trigger === refreshTrigger;
    if (!isTheSame) lastFetched.current = loadCache;

    const loadData = async () => {
      setIsLoading(true);
      try {
        const userProfile = await fetchProfile(booruUrl, userId);
        if (loadCache.isMounted) setProfile(userProfile);

        if (userProfile) {
          // Fetch secondary data concurrently to populate the profile panels
          const account = await getAccountBooru(booruUrl);
          const uploaderQuery = `uploader_id:${userProfile.id}`;
          const favedQuery = `faved_by_id:${userProfile.id}`;
          const allowedBoorus = [booruUrl];

          // await clearImageCache();
          await Promise.all([
            syncUserGalleryPages({
              query: parseQueryResults(uploaderQuery),
              allowedBoorus,
              perPage: 4,
              account,
            }),
            syncUserGalleryPages({
              query: parseQueryResults(favedQuery),
              allowedBoorus,
              perPage: 4,
              account,
            }),
          ]);

          const [uploadsRes, favesRes, commentsRes] = await Promise.all([
            searchImages({
              query: parseQueryResults(uploaderQuery),
              limit: 4,
              allowedBoorus: allowedBoorus,
            }),
            searchImages({
              query: parseQueryResults(favedQuery),
              limit: 4,
              allowedBoorus: allowedBoorus,
            }),
            fetchComments(booruUrl, account.apiKey, `user_id:${userId}`, 1),
          ]);

          if (loadCache.isMounted) {
            setRecentUploads(uploadsRes);
            setRecentFaves(favesRes);
            setRecentComments(commentsRes.comments.slice(0, 3));
          }
        }
      } catch (err) {
        console.error('Error loading profile data:', err);
      } finally {
        if (loadCache.isMounted) setIsLoading(false);
      }
    };

    if (!isTheSame) loadData();
    else lastFetched.current.isMounted = true;
    return () => {
      loadCache.isMounted = false;
    };
  }, [booruUrl, userId, refreshTrigger]);

  if (isLoading) {
    return (
      <div className="text-center py-5 fade-in">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-3 fw-bold text-muted">Loading profile data...</p>
      </div>
    );
  }

  if (!pf) {
    return (
      <div className="container mt-5 fade-in">
        <button onClick={onClose} className="btn btn-secondary mb-4">
          &laquo; Back
        </button>
        <div className="alert alert-danger text-center shadow-sm">
          <h4 className="alert-heading">User not found</h4>
          <p>We couldn't retrieve the profile. They might not exist or the API is unavailable.</p>
        </div>
      </div>
    );
  }

  /** @type {UserProfileData} */
  const profile = pf;
  const openImagesInApp = localStorage.getItem('app_inAppViewer') === 'true';

  return (
    <div className="fade-in">
      {/* Top Toolbar */}
      <div className="viewer-toolbar d-flex flex-wrap align-items-center px-3 py-1 gap-3 mb-4">
        <button onClick={onClose} className="btn-tool" title="Back">
          &laquo; Back
        </button>
        <div className="ms-auto d-flex flex-wrap gap-1">
          <a
            href={`${booruUrl}/profiles/${encodeURIComponent(profile.name.replace(/ /g, '+'))}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-tool"
          >
            👁 View on Booru
          </a>
        </div>
      </div>

      <div className="container-fluid px-2 px-md-4" style={{ maxWidth: '1400px' }}>
        {/* Profile Header */}
        <div className="d-flex flex-column flex-md-row gap-3 mb-4 align-items-md-end">
          <div
            className="rounded shadow-sm border border-secondary"
            style={{
              width: '120px',
              height: '120px',
              backgroundImage: profile.avatarUrl ? `url(${profile.avatarUrl})` : null,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundColor: profile.avatarUrl ? 'transparent' : 'var(--app-primary)',
              flexShrink: 0,
            }}
          ></div>
          <div className="flex-grow-1">
            <h2 className="fw-bold mb-1 d-flex align-items-center gap-2">
              {profile.name}'s profile
            </h2>
            <div className="mb-2">
              <span className="badge bg-secondary text-light">{profile.role || 'Member'}</span>
            </div>
            <div className="text-muted small fw-semibold">
              Member since {timeSince(profile.createdAt)}
            </div>
            <div className="text-muted small">{new URL(booruUrl).hostname}</div>
          </div>
          <div className="d-flex flex-wrap gap-3 text-muted small fw-semibold">
            <div className="d-flex flex-column">
              <a
                href={`${booruUrl}/conversations/new?recipient=${username}`}
                target="_blank"
                className="text-decoration-none text-muted btn-tool p-0"
              >
                Send message
              </a>
              <a
                href={`${booruUrl}/conversations?with=${userId}`}
                target="_blank"
                className="text-decoration-none text-muted btn-tool p-0"
              >
                Our conversations
              </a>
              <a
                href={`${booruUrl}/profiles/${username}/reports/new`}
                target="_blank"
                className="text-decoration-none text-muted btn-tool p-0"
              >
                Report this user
              </a>
            </div>
            <div className="d-flex flex-column">
              <a
                href={`${booruUrl}/search?q=uploader_id%3A${userId}`}
                target="_blank"
                className="text-decoration-none text-muted btn-tool p-0"
              >
                Uploads
              </a>
              <a
                href={`${booruUrl}/comments?cq=user_id%3A${userId}`}
                target="_blank"
                className="text-decoration-none text-muted btn-tool p-0"
              >
                Comments
              </a>
              <a
                href={`${booruUrl}/posts?pq=user_id%3A${userId}`}
                target="_blank"
                className="text-decoration-none text-muted btn-tool p-0"
              >
                Posts
              </a>
              <a
                href={`${booruUrl}/reports`}
                target="_blank"
                className="text-decoration-none text-muted btn-tool p-0"
              >
                My reports
              </a>
            </div>
            <div className="d-flex flex-column">
              <a
                href={`${booruUrl}/search?q=faved_by_id%3A${userId}`}
                target="_blank"
                className="text-decoration-none text-muted btn-tool p-0"
              >
                Favorites
              </a>
              <a
                href={`${booruUrl}/profiles/${username}/tag_changes`}
                target="_blank"
                className="text-decoration-none text-muted btn-tool p-0"
              >
                Tag changes
              </a>
              <a
                href={`${booruUrl}/profiles/${username}/source_changes`}
                target="_blank"
                className="text-decoration-none text-muted btn-tool p-0"
              >
                Source changes
              </a>
            </div>
          </div>
        </div>

        <div className="row g-4">
          {/* Left Sidebar */}
          <div className="col-12 col-lg-3">
            {/* User Links */}
            {/*
              <div className="philo-panel mb-3">
              <div className="philo-panel-header">User Links</div>
              <div className="philo-panel-body p-2 d-flex flex-column gap-2 text-center">
                {profile.links.length > 0 ? (
                  profile.links.map((link, i) => (
                    <div key={i} className="mb-2">
                      <span className="badge" style={{ backgroundColor: '#4834d4' }}>
                        {link.title || 'Link'}
                      </span>
                      <br />
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="small text-truncate d-inline-block w-100"
                        style={{ color: 'var(--app-primary)' }}
                      >
                        {link.url}
                      </a>
                    </div>
                  ))
                ) : (
                  <span className="text-muted small">No links provided.</span>
                )}
              </div>
            </div>
             */}

            {/* Award */}
            <div className="philo-panel mb-3">
              <div className="philo-panel-header">Badges</div>
              <div className="philo-panel-body gap-1">
                <table className="w-100 m-0 py-2">
                  <tbody>
                    {profile.awards.length > 0 ? (
                      profile.awards.map((award, i) => (
                        <tr key={i}>
                          <td className="text-center py-2 px-3">
                            <img
                              src={award.imageUrl}
                              alt={award.title}
                              title={award.title}
                              style={{ width: '32px', height: '32px', borderRadius: '4px' }}
                            />
                            <div className="small">{award.title}</div>
                          </td>
                          <td className="text-center py-2 px-3">{timeSince(award.awardedOn)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="text-center text-muted small p-2">No awards yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* About Me */}
            <div className="philo-panel mb-4">
              <div className="philo-panel-header">About Me</div>
              <div
                className="philo-panel-body small text-muted p-2"
                style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
              >
                {profile.description ? (
                  <CommentBody
                    body={profile.description}
                    booruUrl={booruUrl}
                    onOpenImageLink={onOpenImage}
                    onOpenProfileLink={onOpenProfile}
                    setIsLoading={setIsLoading}
                  />
                ) : (
                  <i>User has not written a description.</i>
                )}
              </div>
            </div>
          </div>

          {/* Right Main Content */}
          <div className="col-12 col-lg-9">
            {/* Statistics */}
            <div className="philo-panel mb-4">
              <div className="philo-panel-header text-muted fw-normal">
                Statistics (Last 90 Days)
              </div>
              <div className="philo-panel-body p-0">
                <table
                  className="table table-borderless table-sm m-0"
                  style={{ backgroundColor: 'transparent' }}
                >
                  <tbody>
                    {[
                      { label: 'Uploads', val: profile.uploadsCount },
                      { label: 'Comments', val: profile.commentsCount },
                      { label: 'Forum Posts', val: profile.postsCount },
                    ].map((stat, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td className="text-end text-muted pe-4 py-2" style={{ width: '20%' }}>
                          {stat.label}
                        </td>
                        <td className="fw-bold py-2 text-muted" style={{ width: '80%' }}>
                          {stat.val}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Creations/Uploads (Reusing Logic) */}
            <div className="philo-panel mb-4">
              <div className="philo-panel-header justify-content-between">
                <span>Recent Uploads</span>
                <a
                  href={`/search?q=uploader%3A${encodeURIComponent(profile.name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) =>
                    handleQuickLinkClick(e, `uploader:${profile.name}`, 'created_at', 'desc')
                  }
                  className="btn btn-link text-white text-decoration-none small p-0 align-baseline"
                >
                  View all
                </a>
              </div>
              <div className="philo-panel-body p-2">
                {recentUploads.length > 0 ? (
                  <div className="row row-cols-2 row-cols-md-4 g-2">
                    {recentUploads.map((img) => (
                      <div className="col" key={img.id}>
                        <Image img={img} onOpenImage={onOpenImage} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted py-3">No recent uploads.</div>
                )}
              </div>
            </div>

            {/* Recent Favorites */}
            <div className="philo-panel mb-4">
              <div className="philo-panel-header justify-content-between">
                <span>Recent Favorites</span>
                <a
                  href={`/search?q=faved_by:${encodeURIComponent(profile.name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) =>
                    handleQuickLinkClick(e, `faved_by:${profile.name}`, 'created_at', 'desc')
                  }
                  className="btn btn-link text-white text-decoration-none small p-0 align-baseline"
                >
                  View all
                </a>
              </div>
              <div className="philo-panel-body p-2">
                {recentFaves.length > 0 ? (
                  <div className="row row-cols-2 row-cols-md-4 g-2">
                    {recentFaves.map((img) => (
                      <div className="col" key={img.id}>
                        <Image img={img} onOpenImage={onOpenImage} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted py-3">No recent favorites.</div>
                )}
              </div>
            </div>

            {/* Recent Comments */}
            <div className="philo-panel mb-4">
              <div className="philo-panel-header justify-content-between">
                <span>Recent Comments</span>
                <a
                  href={`${booruUrl}/comments?q=author:${profile.name}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-decoration-none text-light fw-bold"
                >
                  View all
                </a>
              </div>
              <div className="philo-panel-body">
                {recentComments.length > 0 ? (
                  <div className="d-flex flex-column">
                    {recentComments.map((comment) => (
                      <div
                        key={comment.id}
                        className="p-3 border-bottom d-flex gap-3"
                        style={{ borderColor: 'var(--app-border)' }}
                      >
                        <div style={{ width: '60px', flexShrink: 0 }}>
                          <div
                            className="bg-secondary rounded"
                            style={{
                              width: '60px',
                              height: '60px',
                              backgroundImage: `url(${comment.avatar})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                            }}
                          ></div>
                        </div>
                        <div className="flex-grow-1">
                          <div className="fw-bold mb-1 d-flex justify-content-between">
                            {comment.userId ? (
                              <ProfileLink
                                booruUrl={booruUrl}
                                username={comment.author}
                                userId={comment.userId}
                                onClick={(e) => {
                                  if (localStorage.getItem('app_inAppProfileViewer') !== 'true')
                                    return;
                                  e.preventDefault();
                                  onOpenProfile(booruUrl, comment.author, comment.userId);
                                }}
                                openProfile={onOpenProfile}
                              >
                                {comment.author}
                              </ProfileLink>
                            ) : (
                              <span style={{ color: 'var(--app-primary)' }}>
                                {comment.author ?? 'Anonymous'}
                              </span>
                            )}
                          </div>
                          <div className="text-muted mb-2 small" style={{ fontSize: '0.85rem' }}>
                            <CommentBody
                              body={comment.body}
                              booruUrl={booruUrl}
                              imageId={comment.imageId}
                              onOpenImageLink={onOpenImage}
                              onOpenProfileLink={onOpenProfile}
                              setIsLoading={setIsLoading}
                            />
                          </div>
                          <div className="d-flex justify-content-between small text-muted">
                            <span>Posted {timeSince(comment.createdAt)}</span>
                            <div className="d-flex gap-2">
                              <a
                                href={
                                  openImagesInApp
                                    ? `/${new URL(booruUrl).hostname}/images/${comment.imageId}#comment_${comment.id}`
                                    : `${booruUrl}/images/${comment.imageId}#comment_${comment.id}`
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted text-decoration-none"
                                onClick={(e) => {
                                  if (!openImagesInApp) return;
                                  e.preventDefault();
                                  openImageLink(
                                    booruUrl,
                                    onOpenImage,
                                    setIsLoading,
                                    comment.imageId,
                                  );
                                }}
                              >
                                🔗 Link
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted py-4">No recent comments.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
