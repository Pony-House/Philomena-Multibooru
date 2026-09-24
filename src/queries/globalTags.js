import { logger } from '../Console.mjs';

/**
 * Always use geString when comparing a query against '*'.
 * Additionally, ensure parseQueryResults is used whenever executing a query within a script.
 * This ensures the tagging system remains consistent with the user's settings.
 */

// Video tags
export const videoTags = ['video'];

// Global expression
let globalExpression = ['*'];

// Video mode
if (localStorage.getItem('app_recVideoMode') === 'true') {
  globalExpression.push(...videoTags);
  globalExpression = globalExpression.filter((v) => v !== '*');
}

const geString = globalExpression.join(', ');

// Welcome warning
logger.log(`Your global query is "${geString}".`);

/**
 * @param {string} query
 * @returns {string}
 */
export const parseQueryResults = (query) => {
  if (query === geString || !query) return geString;
  if (geString === '*') return query;
  return `${geString}, ${query}`;
};

// Export
export { globalExpression, geString };
