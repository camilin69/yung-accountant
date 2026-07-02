import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: '127.0.0.1',
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // ── Our custom service worker (src/sw.js) ─────────────────
      // injectManifest compiles src/sw.js through workbox-build,
      // injecting the precache manifest. All runtime caching,
      // background sync, onSync client broadcasts, and
      // force-cleanup-stale handling live in src/sw.js.
      //
      // ⚠️  npm run build && npm run preview  — to test the SW
      //     npm run dev does NOT compile the SW (the raw import
      //     statements in src/sw.js can't run in a browser).
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      devOptions: { enabled: false },
      includeAssets: ['favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'screenshots/dashboard-wide.png', 'screenshots/calendar-wide.png', 'screenshots/dashboard-narrow.png', 'screenshots/calendar-narrow.png'],
      manifest: {
        name: 'Yung Accountant',
        short_name: 'YungAccountant',
        description: 'Personal financial management with social features',
        start_url: '/',
        display: 'standalone',
        background_color: '#0F0F1A',
        theme_color: '#0F0F1A',
        orientation: 'portrait-primary',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        categories: ['finance', 'social', 'productivity'],
        screenshots: [
          { src: '/screenshots/dashboard-wide.png', sizes: '1280x720', type: 'image/png', form_factor: 'wide', label: 'Dashboard with spending overview and recent transactions' },
          { src: '/screenshots/calendar-wide.png', sizes: '1280x720', type: 'image/png', form_factor: 'wide', label: 'Calendar view with daily transaction breakdown' },
          { src: '/screenshots/dashboard-narrow.png', sizes: '720x1280', type: 'image/png', form_factor: 'narrow', label: 'Mobile dashboard with wallet balances' },
          { src: '/screenshots/calendar-narrow.png', sizes: '720x1280', type: 'image/png', form_factor: 'narrow', label: 'Mobile calendar with quick-add transactions' },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
  ],
})
