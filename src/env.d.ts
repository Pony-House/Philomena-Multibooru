/// <reference types="vite/client" />
import React from 'react';

import TinyServiceWorker from 'tiny-essentials/libs/router/TinyServiceWorker';

declare global {
  type ReactSetStateAction<T> = [T, React.Dispatch<React.SetStateAction<T>>];
  interface Window {
    __TINY_PWA_MANIFEST__: Record<string, any>;
    swManager: TinyServiceWorker<"web-manager", "/sw.js">;
    // alert: typeof alert;
    // confirm: typeof confirm;
    // prompt: typeof prompt;
  }
}
