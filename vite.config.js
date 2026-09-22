import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import react from '@vitejs/plugin-react';
import tinyVitePwaPlugin from 'tiny-essentials/webTemplates/vite/7.3/plugins/tinyVitePwaPlugin';
import { copyIndexToGithub404 } from 'tiny-essentials/webTemplates/vite/7.3/plugins/githubUtils';

const manifest = {
  id: 'philomena_multibooru',
  name: 'Philomena Multi-Booru',
  short_name: 'Multi-Booru',
  description: 'An advanced, customizable gallery viewer for Philomena-based boorus.',
  start_url: '/',
  display: 'standalone',
  background_color: '#f8fafc',
  theme_color: '#4f46e5',
  orientation: 'any',
  categories: ['entertainment', 'photo', 'utilities', 'philomena'],
  icons: [
    { src: '/icon/16.png', type: 'image/png', sizes: '16x16', purpose: 'any maskable' },
    { src: '/icon/48.png', type: 'image/png', sizes: '48x48', purpose: 'any maskable' },
    { src: '/icon/72.png', type: 'image/png', sizes: '72x72', purpose: 'any maskable' },
    { src: '/icon/96.png', type: 'image/png', sizes: '96x96', purpose: 'any maskable' },
    { src: '/icon/144.png', type: 'image/png', sizes: '144x144', purpose: 'any maskable' },
    { src: '/icon/168.png', type: 'image/png', sizes: '168x168', purpose: 'any maskable' },
    { src: '/icon/192.png', type: 'image/png', sizes: '192x192', purpose: 'any maskable' },
    { src: '/icon/512.png', type: 'image/png', sizes: '512x512', purpose: 'any maskable' },
  ],
};

export default defineConfig({
  server: {
    port: 5174,
  },
  base: '/',
  build: {
    assetsDir: 'assets',
  },
  plugins: [
    react(),
    copyIndexToGithub404(),
    nodePolyfills({ include: ['events'] }),
    tinyVitePwaPlugin({
      injectManifestToGlobal: false,
      injectRegister: false,
      manifest: manifest,
      manifestPath: '/manifest.json',
      srcDir: 'src/sw/service',
      filename: 'sw.js',
    }),
  ],
});
