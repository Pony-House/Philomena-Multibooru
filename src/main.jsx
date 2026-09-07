import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BootstrapDialogs,
  alert,
  confirm,
  prompt,
} from 'tiny-essentials/webTemplates/bootstrap/5.3/html/BootstrapDialogs';
// @ts-ignore
import { Modal } from 'bootstrap/dist/js/bootstrap.bundle.min.js';

import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/video.css';

import '@fortawesome/fontawesome-free/css/all.min.css';
import 'bootstrap/dist/css/bootstrap.min.css'; // Bootstrap import
import './index.scss';

import ServiceWorkerSync from './components/utils/ReactRouter.jsx';
import App from './App.jsx';

// @ts-ignore
BootstrapDialogs.Modal = Modal;
// @ts-ignore
window.alert = (msg) => alert(msg);
// @ts-ignore
window.confirm = (msg) => confirm(msg);
// @ts-ignore
window.prompt = (msg, def) => prompt(msg, def);

const headerConfig = BootstrapDialogs.headerConfig;
BootstrapDialogs.headerConfig = {
  className: headerConfig.className,
  styles: { ...headerConfig.styles, 'background-color': 'var(--app-navbar-bg, #000) !important' },
};

const titleConfig = BootstrapDialogs.titleConfig;
BootstrapDialogs.titleConfig = {
  className: titleConfig.className,
  styles: { ...titleConfig.styles, color: '#fff' },
};

const root = document.getElementById('root');
if (!root) throw new Error('Root container not found!');

createRoot(root).render(
  <StrictMode>
    <ServiceWorkerSync />
    <App />
  </StrictMode>,
);
