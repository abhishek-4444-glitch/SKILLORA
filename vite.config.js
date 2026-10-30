import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' keeps asset paths relative so the build works on GitHub Pages sub-paths and Vercel alike.
export default defineConfig({
  plugins: [react()],
  base: './',
  // Pre-bundle heavy dependencies at startup so the dev server never re-optimises them
  // mid-session (which breaks already-loaded pages with "Outdated Optimize Dep").
  optimizeDeps: {
    include: ['jspdf', 'recharts', 'papaparse'],
  },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          charts: ['recharts'],
          pdf: ['jspdf'],
        },
      },
    },
  },
});
