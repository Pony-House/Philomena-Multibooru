import { sw, tinySw } from './config.mjs';

/** @type {Map<string, string>} */
const activeScanners = new Map();

/**
 * @returns {Promise<void>}
 */
const cleanGhostScanners = async () => {
  /** @type {readonly WindowClient[]} */
  const clientList = await sw.clients.matchAll({ type: 'window', includeUncontrolled: true });

  /** @type {string[]} */
  const activeClientIds = clientList.map((c) => c.id);

  for (const id of activeScanners.keys()) {
    if (!activeClientIds.includes(id)) {
      activeScanners.delete(id);
      console.log(`[ServiceWorker] Removed ghost scanner: ${id}`);
    }
  }
};

// Scanner Logic
tinySw.addMessageListener('REQUEST_START_SCANNER', async ({ clientId, data, reply }) => {
  await cleanGhostScanners();

  /** @type {string} */
  const queryKey = data?.queryKey || 'default';

  /** @type {boolean} */
  let isDuplicate = false;

  for (const [id, q] of activeScanners.entries()) {
    if (id !== clientId && q === queryKey) {
      isDuplicate = true;
      break;
    }
  }

  if (isDuplicate || activeScanners.has(clientId)) {
    reply('SCANNER_DUPLICATE_QUERY');
  } else if (activeScanners.size > 3) {
    reply('SCANNER_LIMIT_REACHED');
  } else {
    activeScanners.set(clientId, queryKey);
    reply('SCANNER_STARTED');
  }
});

tinySw.addMessageListener('STOP_SCANNER', ({ clientId, reply }) => {
  activeScanners.delete(clientId);
  reply('SCANNER_STOPPED');
});
