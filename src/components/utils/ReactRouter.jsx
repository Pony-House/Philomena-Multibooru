import { useEffect } from 'react';
import TinyDomReadyManager from 'tiny-essentials/libs/html/TinyDomReadyManager';
import { waitForTrue } from 'tiny-essentials/basics/promiseUtils';
import { getDbConnStatus } from '../../db/connection.js';
import { importantTasks } from '../../tools/utils.js';
import { swManager } from '../../tools/sw.mjs';

const readyPage = new TinyDomReadyManager();
readyPage.onReady(
  async () => {
    try {
      await waitForTrue(() => getDbConnStatus() >= 2);
      await importantTasks.enqueue(() =>
        swManager.register({ type: import.meta.env.DEV ? 'module' : 'classic' }),
      );
    } catch (err) {
      console.error('Initialization failed', err);
    }
  },
  { once: true },
);
readyPage.init();

/**
 * Hook to synchronize and validate routes with the Service Worker
 */
const ServiceWorkerSync = () => {
  // Global listener for Favicon Sync across tabs
  useEffect(() => {
    /**
     * Handle incoming broadcasts from the Service Worker.
     */
    const onIconUpdate = ({ data }) => {
      // Change the URL depending on the requested state.
      // Note: You need a notification version of your icon here!
      /** @type {string} */
      const targetIcon = data.icon === 'alert' ? '/icon/512-alert.png' : '/icon/512.png';

      /** @type {HTMLLinkElement | null} */
      let link = document.querySelector("link[rel~='icon']");

      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = targetIcon;
    };

    /**
     * Notify the Service Worker to reset the favicon when the user looks at the app.
     * @returns {void}
     */
    const handleVisibilityAndFocus = () => {
      if (!document.hidden) swManager.emit('FAVICON_UPDATE', { icon: 'default' });
    };

    swManager.on('FAVICON_UPDATE', onIconUpdate);
    // Listen to focus and visibility changes to clear the notification icon
    window.addEventListener('focus', handleVisibilityAndFocus);
    document.addEventListener('visibilitychange', handleVisibilityAndFocus);

    // Run once on mount in case the app is already visible
    handleVisibilityAndFocus();

    return () => {
      swManager.off('FAVICON_UPDATE', onIconUpdate);
      window.removeEventListener('focus', handleVisibilityAndFocus);
      document.removeEventListener('visibilitychange', handleVisibilityAndFocus);
    };
  }, []);
  return <></>;
};

export default ServiceWorkerSync;
