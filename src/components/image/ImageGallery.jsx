import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

import { checkLocalFave, toggleLocalFave } from '../../services/api/LocalFaves.js';

/**
 * @template T
 * @typedef {import('react').SetStateAction<T>} SetStateAction
 */

/**
 * @template T
 * @typedef {import('react').Dispatch<T>} Dispatch
 */

/**
 * @typedef {import('../../services/api/Images.js').ImageResult} ImageResult
 * @typedef {import('../../services/api/Images.js').ImageObj} ImageObj
 */

/**
 * Helper component to render a grouped submenu for URLs.
 * @param {{ id: string, icon: string, label: string, url: string, openLeft: boolean, onActionRecord: (id: string, actionType: string) => void, onClose: () => void }} props
 */
const ContextMenuGroup = ({ id, icon, label, url, openLeft, onActionRecord, onClose }) => {
  /** @type {UseStateTemplate<boolean>} */
  const [isOpen, setIsOpen] = useState(false);

  /**
   * @param {string} type
   */
  const handleAction = (type) => {
    if (type === 'copy') navigator.clipboard.writeText(url);
    if (type === 'tab') open(url, '_blank', 'noopener,noreferrer');
    if (type === 'window') open(url, '_blank', 'width=900,height=600,noopener,noreferrer');

    if (onActionRecord) onActionRecord(id, type);
    if (onClose) onClose();
  };

  return (
    <div
      className="position-relative"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        className="dropdown-item d-flex justify-content-between align-items-center fw-semibold rounded"
        style={{
          fontSize: '0.85rem',
          padding: '0.4rem 1rem',
          cursor: 'default',
        }}
        onClick={(e) => e.preventDefault()}
      >
        <span>
          <i
            className={`${icon} me-2 text-primary`}
            style={{ width: '16px', textAlign: 'center' }}
          ></i>
          {label}
        </span>
        <i className="fa-solid fa-chevron-right ms-4 text-muted" style={{ fontSize: '0.7rem' }}></i>
      </button>

      {isOpen && (
        <div
          className="dropdown-menu show shadow position-absolute border p-1"
          style={{
            top: '-5px',
            ...(openLeft
              ? { right: '100%', left: 'auto', marginRight: '2px' }
              : { left: '100%', right: 'auto', marginLeft: '2px' }),
            margin: 0,
            backgroundColor: 'var(--app-surface)',
            minWidth: '170px',
          }}
        >
          <button
            className="dropdown-item fw-semibold rounded py-1"
            style={{ fontSize: '0.85rem' }}
            onClick={() => handleAction('copy')}
          >
            <i className="fa-solid fa-copy me-2" style={{ width: '16px', textAlign: 'center' }}></i>{' '}
            Copy URL
          </button>
          <button
            className="dropdown-item fw-semibold rounded py-1"
            style={{ fontSize: '0.85rem' }}
            onClick={() => handleAction('tab')}
          >
            <i
              className="fa-solid fa-arrow-up-right-from-square me-2"
              style={{ width: '16px', textAlign: 'center' }}
            ></i>{' '}
            New Tab
          </button>
          <button
            className="dropdown-item fw-semibold rounded py-1"
            style={{ fontSize: '0.85rem' }}
            onClick={() => handleAction('window')}
          >
            <i
              className="fa-solid fa-window-restore me-2"
              style={{ width: '16px', textAlign: 'center' }}
            ></i>{' '}
            New Window
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * @param {{ x: number, y: number, img: ImageResult, onClose: () => void, onOpenImage?: (img: ImageResult) => void, hostname: string }} props
 */
const ContextMenu = ({ x, y, img, onClose, onOpenImage, hostname }) => {
  /** @type {string} */
  const appImageUrl = `${location.origin}/${hostname}/images/${img.id}`;
  /** @type {string} */
  const booruImageUrl = `${img.booruUrl}/images/${img.id}`;
  /** @type {string | undefined} */
  const fullImageUrl = img.representations?.full;
  /** @type {string | undefined} */
  const sourceUrl = img.sourceUrl;
  /** @type {boolean} */
  const hasProfile = img.uploaderId ? true : false;

  /** @type {string} */
  const appProfileUrl = hasProfile
    ? `${location.origin}/${hostname}/profiles/${img.uploaderId || img.uploader}`
    : '';

  /** @type {string} */
  const booruProfileUrl = hasProfile
    ? `${img.booruUrl}/profiles/${encodeURIComponent(img.uploader.replace(/ /g, '+'))}`
    : '';

  /** @type {Array<{ id: string, icon: string, label: string, url: string }>} */
  const groups = [
    { id: 'appImage', icon: 'fa-solid fa-image', label: 'Image Page', url: appImageUrl },
    {
      id: 'booruImage',
      icon: 'fa-solid fa-globe',
      label: 'Image Page (Booru)',
      url: booruImageUrl,
    },
    {
      id: 'fullImage',
      icon: 'fa-solid fa-expand',
      label: 'Original Full Image',
      url: fullImageUrl,
    },
  ];

  if (sourceUrl) {
    groups.push({
      id: 'sourceLink',
      icon: 'fa-solid fa-link',
      label: 'Source Link',
      url: sourceUrl,
    });
  }

  if (hasProfile) {
    groups.push({
      id: 'appAuthor',
      icon: 'fa-solid fa-id-badge',
      label: 'Author Profile',
      url: appProfileUrl,
    });
    groups.push({
      id: 'booruAuthor',
      icon: 'fa-solid fa-user-circle',
      label: 'Author Profile (Booru)',
      url: booruProfileUrl,
    });
  }

  /** @type {boolean} */
  const openLeft = x > window.innerWidth - 380;
  /** @type {number} */
  const safeX = Math.min(x, window.innerWidth - 220);

  /** @type {number} */
  const totalItemsCount = (onOpenImage ? 1 : 0) + groups.length + 2;
  /** @type {number} */
  const safeY = Math.min(y, window.innerHeight - totalItemsCount * 40);
  /** @type {boolean} */
  const openImagesInApp = localStorage.getItem('app_inAppViewer') === 'true';

  /** @type {string} */
  const ACTION_KEY = 'app_lastImageMenuAction';

  /**
   * @param {string} groupId
   * @param {string} actionType
   */
  const handleActionRecord = (groupId, actionType) => {
    localStorage.setItem(ACTION_KEY, JSON.stringify({ groupId, actionType }));
  };

  /** @type {string | null} */
  const lastActionStr = localStorage.getItem(ACTION_KEY);
  /** @type {{ groupId: string, actionType: string, group: { id: string, icon: string, label: string, url: string } } | null} */
  let lastAction = null;

  if (lastActionStr) {
    try {
      /** @type {{ groupId: string, actionType: string }} */
      const parsed = JSON.parse(lastActionStr);
      /** @type {{ id: string, icon: string, label: string, url: string } | undefined} */
      const targetGroup = groups.find((g) => g.id === parsed.groupId);
      if (targetGroup && targetGroup.url) {
        lastAction = { ...parsed, group: targetGroup };
      }
    } catch (e) {
      console.error(e);
      // Storage parsing failed, safely ignore
    }
  }

  /**
   * @param {string} type
   * @returns {{ label: string, icon: string }}
   */
  const getActionDetails = (type) => {
    if (type === 'copy') return { label: 'Copy', icon: 'fa-solid fa-copy' };
    if (type === 'tab') return { label: 'New Tab', icon: 'fa-solid fa-arrow-up-right-from-square' };
    if (type === 'window') return { label: 'New Window', icon: 'fa-solid fa-window-restore' };
    return { label: '', icon: '' };
  };

  return createPortal(
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 1040,
        }}
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
      <div
        className="dropdown-menu show shadow p-1"
        style={{
          position: 'fixed',
          top: Math.max(0, safeY),
          left: Math.max(0, safeX),
          zIndex: 1050,
          backgroundColor: 'var(--app-surface)',
          borderColor: 'var(--app-border)',
          minWidth: '220px',
        }}
      >
        {lastAction && (
          <>
            <button
              className="dropdown-item d-flex justify-content-start align-items-center fw-bold rounded mb-1"
              style={{
                fontSize: '0.85rem',
                padding: '0.4rem 1rem',
                backgroundColor: 'rgba(13, 110, 253, 0.1)',
                color: 'var(--app-text)',
              }}
              onClick={(e) => {
                e.preventDefault();
                /** @type {string} */
                const type = lastAction.actionType;
                /** @type {string} */
                const url = lastAction.group.url;

                if (type === 'copy') navigator.clipboard.writeText(url);
                if (type === 'tab') open(url, '_blank', 'noopener,noreferrer');
                if (type === 'window')
                  open(url, '_blank', 'width=900,height=600,noopener,noreferrer');

                handleActionRecord(lastAction.groupId, type);
                onClose();
              }}
            >
              <i
                className={`${getActionDetails(lastAction.actionType).icon} me-2 text-primary`}
                style={{ width: '16px', textAlign: 'center' }}
              ></i>
              <span className="text-truncate">
                Quick {getActionDetails(lastAction.actionType).label}: {lastAction.group.label}
              </span>
            </button>
            <hr className="dropdown-divider my-1" style={{ borderColor: 'var(--app-border)' }} />
          </>
        )}

        {!openImagesInApp && (
          <>
            <button
              className="dropdown-item d-flex justify-content-start align-items-center fw-semibold rounded"
              style={{
                fontSize: '0.85rem',
                padding: '0.4rem 1rem',
              }}
              onClick={(e) => {
                e.preventDefault();
                onOpenImage(img);
                onClose();
              }}
            >
              <i
                className="fa-solid fa-eye me-2 text-primary"
                style={{ width: '16px', textAlign: 'center' }}
              ></i>
              Open in App Viewer
            </button>
            <hr className="dropdown-divider my-1" style={{ borderColor: 'var(--app-border)' }} />
          </>
        )}

        {groups.map((group) => (
          <ContextMenuGroup
            key={group.id}
            id={group.id}
            icon={group.icon}
            label={group.label}
            url={group.url}
            openLeft={openLeft}
            onActionRecord={handleActionRecord}
            onClose={onClose}
          />
        ))}
      </div>
    </>,
    document.body,
  );
};

/**
 * @param {{ img: ImageResult; className?: string; onOpenImage?: (img: ImageResult) => void }} props
 */
export const Image = ({ img, className, onOpenImage }) => {
  /** @type {UseStateTemplate<Set<number>>>} */
  const [unspoileredIds, setUnspoileredIds] = useState(new Set());

  /** @type {UseStateTemplate<{ visible: boolean, x: number, y: number }>} */
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0 });

  /** @type {boolean} */
  const openImagesInApp = localStorage.getItem('app_inAppViewer') === 'true';

  /** @type {boolean} */
  const localFavesEnabled = localStorage.getItem('app_localFavesEnabled') === 'true';

  /** @type {UseStateTemplate<boolean>} */
  const [isLocal, setIsLocal] = useState(false);

  useEffect(() => {
    let isMounted = true;
    /**
     * @returns {Promise<void>}
     */
    const fetchLocalState = async () => {
      /** @type {boolean} */
      const status = await checkLocalFave(img.id, img.booruUrl);
      if (!isMounted) return;
      setIsLocal(status);
    };
    fetchLocalState();
    return () => {
      isMounted = false;
    };
  }, [img.id, img.booruUrl]);

  useEffect(() => {
    if (!contextMenu.visible) return;

    const handleClickOutside = () => setContextMenu({ visible: false, x: 0, y: 0 });
    document.addEventListener('click', handleClickOutside);

    return () => document.removeEventListener('click', handleClickOutside);
  }, [contextMenu.visible]);

  /**
   * @param {import('react').MouseEvent} e
   */
  const handleContextMenu = (e) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const closeContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0 });
  };

  /**
   * @param {import('react').MouseEvent<HTMLAnchorElement>} event
   * @param {number} imageId
   * @param {boolean} isSpoilered
   */
  const handleImageClick = (event, imageId, isSpoilered) => {
    if (isSpoilered && !unspoileredIds.has(imageId)) {
      event.preventDefault();
      /** @type {Set<number>} */
      const newSet = new Set(unspoileredIds);
      newSet.add(imageId);
      setUnspoileredIds(newSet);
      return;
    }

    if (openImagesInApp) {
      event.preventDefault();
      onOpenImage && onOpenImage(img);
    }
  };

  /**
   * Toggles the local favorite state without triggering the image link.
   * @param {import('react').MouseEvent} e
   */
  const handleToggleLocalFave = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!localFavesEnabled) return;

    /** @type {boolean} */
    const newStatus = await toggleLocalFave(img);
    setIsLocal(newStatus);
  };

  const hostname = new URL(img.booruUrl).hostname;

  /** @type {string} */
  const targetUrl = `${img.booruUrl}/images/${img.id}`;
  /** @type {boolean} */
  const isVideo = img.mimeType && img.mimeType.startsWith('video/');
  /** @type {number} */
  const score = img.upvotes - img.downvotes;
  /** @type {boolean} */
  const isFav = img.interaction === 'faved';
  /** @type {boolean} */
  const isUp = isFav || img.interaction === 'upVote';
  /** @type {boolean} */
  const isDown = !isFav && img.interaction === 'downVote';
  /** @type {boolean} */
  const isProcessing = !img.processed || !img.thumbnailsGenerated ? true : false;
  /** @type {boolean} */
  const isBlurry = img.spoilered && !unspoileredIds.has(img.id) ? true : false;
  /** @type {string} */
  const title = `${hostname} - ${img.tags.join(', ')}`;

  return (
    <>
      <div
        className="card h-100 shadow-sm border-0 interaction-card"
        style={{ backgroundColor: 'var(--app-surface)' }}
        onContextMenu={handleContextMenu}
      >
        <a
          href={openImagesInApp ? `/${hostname}/images/${img.id}` : targetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-decoration-none d-block h-100"
          onClick={(e) => handleImageClick(e, img.id, img.spoilered ? true : false)}
        >
          <div
            className={`${className ? className : ''}`}
            style={{
              position: 'relative',
              aspectRatio: '1 / 1',
              backgroundColor: '#000',
              overflow: 'hidden',
            }}
          >
            {isProcessing && (
              <div
                className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column justify-content-center align-items-center bg-dark bg-opacity-75"
                style={{ zIndex: 10 }}
              >
                <div className="spinner-border text-light mb-2" role="status"></div>
                <span
                  className="badge bg-warning text-dark text-wrap px-3 py-2 text-center"
                  style={{ fontSize: '0.75rem' }}
                >
                  Processing...
                </span>
              </div>
            )}

            {!isProcessing && isBlurry && (
              <div
                className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column justify-content-center align-items-center p-2"
                style={{ zIndex: 5, pointerEvents: 'none' }}
              >
                <div className="badge bg-danger fs-6 opacity-75 text-wrap p-2 text-center shadow mb-2">
                  Spoilered
                  <br />
                  <small>(Click to reveal)</small>
                </div>
              </div>
            )}

            <div
              style={{
                filter: isBlurry && !isProcessing ? 'blur(20px)' : 'none',
                transition: 'filter 0.3s ease',
                width: '100%',
                height: '100%',
              }}
            >
              {isVideo ? (
                <video
                  title={title}
                  src={img.representations.full || img.sourceUrl}
                  className="w-100 h-100"
                  style={{ objectFit: 'contain' }}
                  muted
                  loop
                  autoPlay
                  controls={false}
                />
              ) : (
                <img
                  title={title}
                  src={img.representations.thumb || img.sourceUrl}
                  className="w-100 h-100"
                  alt={img.tags?.join(', ') || ''}
                  style={{ objectFit: 'cover' }}
                />
              )}
            </div>

            <div
              className="position-absolute top-0 w-100 text-white d-flex justify-content-between align-items-end"
              style={{ zIndex: 6 }}
            >
              <table className="interaction-container w-100 shadow-sm text-center">
                <tbody>
                  <tr>
                    <td
                      className={`badge-interaction text-end ${isFav ? 'active-fave' : isLocal ? 'active-local-fav' : 'badge-inactive'}`}
                      onClick={localFavesEnabled ? handleToggleLocalFave : undefined}
                      style={{ cursor: localFavesEnabled ? 'pointer' : 'inherit' }}
                      title={localFavesEnabled ? 'Click to toggle Local Fave' : undefined}
                    >
                      {isFav && isLocal ? '★ [B]' : isLocal ? '★ [L]' : '★'} {img.faves}
                    </td>
                    <td
                      className={`badge-interaction text-end ${isUp ? 'active-up' : 'badge-inactive'}`}
                    >
                      ▲
                    </td>
                    <td
                      className={`badge-interaction ${isUp ? 'active-up' : isDown ? 'active-down' : 'badge-inactive'}`}
                    >
                      {score}
                    </td>
                    <td
                      className={`badge-interaction text-start ${isDown ? 'active-down' : 'badge-inactive'}`}
                    >
                      ▼
                    </td>
                    <td className="badge-interaction text-start badge-inactive">
                      💬 {img.commentCount || 0}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="card-body py-2 px-3" style={{ zIndex: 6, position: 'relative' }}>
            <small
              className="text-muted d-block text-truncate fw-semibold"
              style={{ fontSize: '0.75rem' }}
            >
              {img.tags?.join(', ') || ''}
            </small>
          </div>
        </a>
      </div>

      {contextMenu.visible && (
        <ContextMenu
          hostname={hostname}
          x={contextMenu.x}
          y={contextMenu.y}
          img={img}
          onClose={closeContextMenu}
          onOpenImage={onOpenImage}
        />
      )}
    </>
  );
};

/**
 * @param {{ imagesList: ImageResult[], gridClass?: string, onOpenImage?: (img: ImageResult) => void }} props
 */
export const ImageGallery = ({
  imagesList,
  gridClass = 'row-cols-1 row-cols-sm-2 row-cols-md-4 row-cols-lg-4 row-cols-xl-4 row-cols-xxl-6 g-2',
  onOpenImage,
}) => {
  /** @type {boolean} */
  const hasImages = imagesList.length > 0;

  if (!hasImages) {
    return (
      <div className="text-center mt-4 w-100">
        <h5 className="text-muted">No images found.</h5>
      </div>
    );
  }

  return (
    <div className="w-100">
      <div className={`row ${gridClass}`}>
        {imagesList.map((img) => (
          <div className="col" key={`${img.booruUrl}-${img.id}`}>
            <Image img={img} onOpenImage={onOpenImage} />
          </div>
        ))}
      </div>
    </div>
  );
};
