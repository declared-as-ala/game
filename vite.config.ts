import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 3000,
    open: false,
    host: true
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    assetsInlineLimit: 4096,
    rollupOptions: {
      output: {
        manualChunks: {
          pixi: ['pixi.js'],
          planck: ['planck']
        }
      }
    }
  }
});
