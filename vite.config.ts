import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 1420,
    strictPort: true,
    // Ignore Rust build artifacts so Windows file locks don't crash Vite's watcher.
    watch: {
      ignored: ['**/src-tauri/target/**', '**/src-tauri/binaries/**']
    }
  },
  preview: {
    port: 1420,
    strictPort: true
  },
  test: {
    globals: true,
    environmentMatchGlobs: [
      ['src/**/*.test.tsx', 'jsdom'],
      ['src/**/*.test.ts', 'jsdom'],
      ['worker/**/*.test.ts', 'node'],
      ['shared/**/*.test.ts', 'node']
    ],
    setupFiles: ['./vitest.setup.ts'],
    css: false
  }
});
