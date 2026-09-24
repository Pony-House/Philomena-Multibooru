import TinyDebugger from 'tiny-essentials/libs/tools/TinyDebugger';

const debug = new TinyDebugger({
  logger: console,
  id: '[_main_class_Web_reset_]',
  debugMode: import.meta.env.DEV,
  canEmitLogs: false,
  useLogColors: true,
});

export const logger = debug.toConsole();
