import { tinySw } from './config.mjs';

// Favicon Update Logic
tinySw.addMessageListener('FAVICON_UPDATE', async ({ data, event, replyToAll }) => {
  if (typeof data !== 'object' || data === null) {
    console.error(
      '[ServiceWorker] FAVICON_UPDATE error: Payload "data" is missing or not an object.',
    );
    return;
  }

  if (typeof data.icon !== 'string') {
    console.error(
      '[ServiceWorker] FAVICON_UPDATE error: Property "data.icon" is missing or not a string.',
    );
    return;
  }

  console.log(`[ServiceWorker] Broadcasting favicon update: ${data.icon}`);
  event.waitUntil(replyToAll({ type: 'FAVICON_UPDATE', data: { icon: data.icon } }));
});
