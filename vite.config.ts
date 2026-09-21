import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

// Publicado como GitHub Pages de proyecto: sirve en /moon-sport/, no en
// la raíz del dominio. Si cambias de hosting a uno que sirva en la raíz
// (Vercel/Netlify), cambia esto a '/'.
const base = '/moon-sport/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png'],
      manifest: {
        name: 'Moon Sport',
        short_name: 'Moon Sport',
        description: 'Inventario, ventas y apartados de Moon Sport',
        theme_color: '#10162E',
        background_color: '#10162E',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          {
            src: `${base}icon.png`,
            sizes: '1024x1024',
            type: 'image/png',
            purpose: 'any',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
