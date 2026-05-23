import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rolldownOptions: {
      output: {
        manualChunks: (id: string) => {
          if (!id.includes('node_modules')) return;
          if (id.includes('react-dom') || id.match(/[\\/]react[\\/]/)) return 'react-vendor';
          if (id.includes('@mui')) return 'mui-vendor';
          if (id.includes('@tanstack') || id.includes('@trpc')) return 'query-vendor';
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/trpc': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
      '/api/auth': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
    },
  },
});
