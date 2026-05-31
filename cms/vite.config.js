import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http:pengundian-app-server-api.vercel.app',
      '/uploads': 'http:pengundian-app-server-api.vercel.app'
    }
  }
});
