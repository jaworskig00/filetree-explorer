/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * GitHub Pages serves the app from a sub-path (/filetree-explorer/), while local
 * dev and `vite preview` serve it from the root. The Pages build opts in with
 * `vite build --mode pages` so the default deliverable (`npm run dev`) stays plain.
 */
export default defineConfig(({ mode }) => ({
  base: mode === 'pages' ? '/filetree-explorer/' : '/',
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
  },
}));
