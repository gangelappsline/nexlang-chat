import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5176, // Set the development server port
    strictPort: true,
    // The app is served through a preview proxy, so accept any forwarded host.
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 5176,
    allowedHosts: true,
  },
  build: {
    // Force file hashing for cache busting
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name].[hash].js`,
        chunkFileNames: `assets/[name].[hash].js`,
        assetFileNames: `assets/[name].[hash].[ext]`,
      },
    },
    // Generate manifest for better cache control
    manifest: true,
    // Ensure source maps are generated for debugging
    sourcemap: true,
  },
})
