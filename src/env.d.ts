/// <reference types="vite/client" />
import React from 'react';

import TinyServiceWorker from 'tiny-essentials/libs/router/TinyServiceWorker';

declare global {
  type UseStateTemplate<T> = [T, React.Dispatch<React.SetStateAction<T>>];
  type Ref<T> = React.Ref<T>;
  type Dispatch<T> = React.Dispatch<T>;
  type SetStateAction<T> = React.SetStateAction<T>;
  interface Window {
    __TINY_PWA_MANIFEST__: Record<string, any>;
    swManager: TinyServiceWorker<'web-manager', '/sw.js'>;
    // alert: typeof alert;
    // confirm: typeof confirm;
    // prompt: typeof prompt;
  }
}
