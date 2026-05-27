import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    // Pre-bundle the heavy deps up front so opening the briefing screen doesn't
    // trigger an on-demand optimize + full reload mid-flow. recharts pulls in all
    // of d3, so discovering it lazily is the most disruptive case.
    include: ['react', 'react-dom', 'react-dom/client', 'recharts', 'framer-motion', 'lucide-react', 'zustand'],
  },
  server: {
    // Bind IPv4 explicitly. On this machine Node resolves `localhost` to the
    // IPv6 loopback (::1), where requests hang — 127.0.0.1 responds normally.
    host: '127.0.0.1',
    // Port 5173 hangs on this machine (connections accepted but never answered,
    // likely an editor port-forward/security filter on the well-known Vite port).
    // 5180 is clear.
    port: 5180,
    strictPort: true,
    proxy: {
      // Anything starting with /api gets forwarded to the Express server.
      // Lets the client call fetch('/api/brief') without worrying about CORS.
      '/api': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
      },
    },
  },
});
