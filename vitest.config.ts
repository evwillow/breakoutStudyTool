import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/web/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.next/**', '**/.turbo/**', '**/lib/**/node_modules/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/web'),
      '@/components': path.resolve(__dirname, './src/web/components'),
      '@/lib': path.resolve(__dirname, './src/web/lib'),
      '@/services': path.resolve(__dirname, './src/web/services'),
      '@/config': path.resolve(__dirname, './src/web/config'),
      '@/app': path.resolve(__dirname, './src/web/app'),
      '@breakout-study-tool/shared': path.resolve(__dirname, './lib/shared/src'),
    },
  },
});
