import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        devOptions: {
          enabled: true
        },
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg', 'logo.png'],
        manifest: {
          id: '/?source=pwa',
          name: 'Agaram Dhines Online Academy',
          short_name: 'Agaram',
          description: 'Agaram Dhines Online Academy App',
          theme_color: '#ffffff',
          background_color: '#ffffff',
          display: 'standalone',
          display_override: ['window-controls-overlay', 'standalone', 'browser'],
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          lang: 'ta',
          dir: 'ltr',
          categories: ['education', 'productivity'],
          iarc_rating_id: 'e84b072d-71b3-4d3e-86ae-31a8ce4e53b7',
          prefer_related_applications: false,
          related_applications: [
            {
              platform: 'webapp',
              url: 'https://app-agaramdhines-lk.vercel.app/manifest.webmanifest'
            }
          ],
          scope_extensions: [
            { origin: 'https://app-agaramdhines-lk.vercel.app' }
          ],
          file_handlers: [
            {
              action: '/',
              accept: {
                'application/pdf': ['.pdf'],
                'image/png': ['.png'],
                'image/jpeg': ['.jpg', '.jpeg']
              }
            }
          ],
          shortcuts: [
            {
              name: 'Student Dashboard',
              url: '/student-dashboard',
              description: 'Go to Student Dashboard'
            },
            {
              name: 'Admin Panel',
              url: '/admin',
              description: 'Go to Admin Panel'
            }
          ],
          icons: [
            {
              src: '/logo.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/logo.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'maskable'
            },
            {
              src: '/logo.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/logo.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ],
          screenshots: [
            {
              src: '/logo.png',
              sizes: '1080x1920',
              type: 'image/png',
              form_factor: 'narrow',
              label: 'Agaram Dhines Academy App View'
            },
            {
              src: '/logo.png',
              sizes: '1920x1080',
              type: 'image/png',
              form_factor: 'wide',
              label: 'Agaram Dhines Academy Home'
            }
          ]
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 5000000, // 5 MB
          globPatterns: ['**/*.{js,css,html,ico,png,svg}']
        }
      })
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              return 'vendor';
            }
          }
        }
      }
    },
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
