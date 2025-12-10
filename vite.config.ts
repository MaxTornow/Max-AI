import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util']
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@context': path.resolve(__dirname, './src/context'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@services': path.resolve(__dirname, './src/services'),
      '@assets': path.resolve(__dirname, './src/assets'),
      '@types': path.resolve(__dirname, './src/types'),
    },
  },
  server: {
    port: 3000,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    },
    proxy: {
      '/api/fastsaver': {
        target: 'https://fastsaverapi.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/fastsaver/, ''),
        secure: true,
        headers: {
          'Accept': 'application/json'
        }
      },
      '/api/claude': {
        target: 'https://api.anthropic.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/claude/, ''),
        secure: true,
        configure: (proxy, options) => {
          // Log requests going through the proxy (for debugging)
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Proxying request to Claude API:', req.url);
            
            // Add the required header for browser-based requests to Claude API
            proxyReq.setHeader('anthropic-dangerous-direct-browser-access', 'true');
            
            // Log headers for debugging
            console.log('Request headers:', proxyReq.getHeaders());
          });
          
          // Log responses from the proxy (for debugging)
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('Received response from Claude API:', proxyRes.statusCode);
          });
          
          // Log errors
          proxy.on('error', (err, req, res) => {
            console.error('Proxy error:', err);
          });
        }
      }
    }
  },
});