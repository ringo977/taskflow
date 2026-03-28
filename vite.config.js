import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    coverage: {
      provider: 'v8',
      reportsDirectory: '/tmp/taskflow-coverage',
      reporter: ['text', 'text-summary', 'json-summary'],
      include: [
        'src/hooks/useRuleEngine.js',
        'src/hooks/useProjectActions.js',
        'src/hooks/useTaskActions.js',
        'src/utils/*.{js,jsx}',
        'src/components/FormSubmitModal.jsx',
        'src/data/**/*.{js,jsx}',
        'src/lib/db/adapters.js',
        'src/constants.js',
      ],
      exclude: ['src/test/**', 'src/**/*.test.*', 'src/**/*.spec.*', 'src/utils/highlight.jsx'],
      thresholds: {
        statements: 70,
        branches: 55,
        functions: 70,
        lines: 70,
      },
    },
  },
  base: '/taskflow/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-192.svg', 'icon-512.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'TaskFlow — MiMic Lab',
        short_name: 'TaskFlow',
        description: 'Project management for MiMic Lab',
        theme_color: '#378ADD',
        background_color: '#eae8e1',
        display: 'standalone',
        scope: '/taskflow/',
        start_url: '/taskflow/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          { src: 'icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: 'icon-512.svg', sizes: '512x512', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        sourcemap: false,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              expiration: { maxEntries: 50, maxAgeSeconds: 300 },
              networkTimeoutSeconds: 5,
            },
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-charts': ['recharts'],
          'vendor-pdf': ['jspdf'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-date': ['date-fns'],
          'vendor-router': ['react-router-dom'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
})
