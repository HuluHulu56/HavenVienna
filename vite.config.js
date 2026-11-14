import { defineConfig } from 'vite';

export default defineConfig({
  // Relative paths so the build works inside itch.io's iframe.
  base: './',
  server: { port: 5173 },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 2000,
  },
});
