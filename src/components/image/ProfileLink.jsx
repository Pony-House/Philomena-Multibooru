import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

/** @typedef {import('react').MouseEvent} MouseEvent */
/** @typedef {import('react').MouseEventHandler} MouseEventHandler */

/**
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
 * @typedef {(booruUrl: string, username: string, id: number) => void} OpenProfile
 */

/**
 * @param {{ x: number, y: number, booruUrl: string, username: string, userId?: number | null, onClose: () => void, openProfile: OpenProfile }} props
 */
const ProfileContextMenu = ({ x, y, booruUrl, username, userId, onClose, openProfile }) => {
  /** @type {string} */
  const booruHostname = new URL(booruUrl).hostname;
  /** @type {string} */
  const appProfileUrl = `${location.origin}/${booruHostname}/profiles/${userId}`;
  /** @type {string} */
  const booruProfileUrl = `${booruUrl}/profiles/${encodeURIComponent(username.replace(/ /g, '+'))}`;

  /** @type {Array<{ id: string, icon: string, label: string, url: string }>} */
  const groups = [
    { id: 'appProfile', icon: 'fa-solid fa-id-badge', label: 'App Profile', url: appProfileUrl },
    {
      id: 'booruProfile',
      icon: 'fa-solid fa-user-circle',
      label: 'Booru Profile',
      url: booruProfileUrl,
    },
  ];

  /** @type {boolean} */
  const openProfilesInApp = localStorage.getItem('app_inAppProfileViewer') === 'true';
  /** @type {boolean} */
  const openLeft = x > window.innerWidth - 380;
  /** @type {number} */
  const safeX = Math.min(x, window.innerWidth - 220);

  /** @type {string} */
  const ACTION_KEY = 'app_lastProfileMenuAction';

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
      // Safely ignore parsing issues
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

  /** @type {number} */
  const totalItemsCount = (!openProfilesInApp ? 1 : 0) + groups.length + (lastAction ? 1 : 0);
  /** @type {number} */
  const safeY = Math.min(y, window.innerHeight - totalItemsCount * 40);

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

        {!openProfilesInApp && (
          <>
            <button
              className="dropdown-item d-flex justify-content-start align-items-center fw-semibold rounded"
              style={{
                fontSize: '0.85rem',
                padding: '0.4rem 1rem',
                color: 'var(--app-text)',
              }}
              onClick={(e) => {
                e.preventDefault();
                openProfile(booruUrl, String(userId), userId ?? 0);
                onClose();
              }}
            >
              <i
                className="fa-solid fa-id-badge me-2 text-primary"
                style={{ width: '16px', textAlign: 'center' }}
              ></i>
              Open Profile in App
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
 * @param {{ booruUrl: string, username: string, userId?: number | null, className?: string, children: import('react').ReactNode, openProfile: OpenProfile, onClick: MouseEventHandler }} props
 */
export const ProfileLink = ({
  booruUrl,
  username,
  userId,
  className,
  children,
  onClick,
  openProfile,
}) => {
  /** @type {UseStateTemplate<{ visible: boolean, x: number, y: number }>} */
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0 });

  /** @type {boolean} */
  const openProfilesInApp = localStorage.getItem('app_inAppProfileViewer') === 'true';
  /** @type {string} */
  const booruHostname = new URL(booruUrl).hostname;

  /** @type {string} */
  const appProfileUrl = `/${booruHostname}/profiles/${userId}`;
  /** @type {string} */
  const booruProfileUrl = `${booruUrl}/profiles/${encodeURIComponent(username.replace(/ /g, '+'))}`;

  /** @type {string} */
  const targetUrl = openProfilesInApp ? appProfileUrl : booruProfileUrl;

  useEffect(() => {
    if (!contextMenu.visible) return;

    const handleClickOutside = () => setContextMenu({ visible: false, x: 0, y: 0 });
    document.addEventListener('click', handleClickOutside);

    return () => document.removeEventListener('click', handleClickOutside);
  }, [contextMenu.visible]);

  /**
   * @param {MouseEvent} e
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

  return (
    <>
      <a
        href={targetUrl}
        target={openProfilesInApp ? undefined : '_blank'}
        rel={openProfilesInApp ? '' : 'noopener noreferrer'}
        className={className || 'text-decoration-none fw-bold text-primary cursor-pointer'}
        onContextMenu={handleContextMenu}
        onClick={onClick}
      >
        {children}
      </a>

      {contextMenu.visible && (
        <ProfileContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          booruUrl={booruUrl}
          username={username}
          userId={userId}
          openProfile={openProfile}
          onClose={closeContextMenu}
        />
      )}
    </>
  );
};
