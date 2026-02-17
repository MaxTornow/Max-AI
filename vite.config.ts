import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  return {
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
        '/api/video-proxy': {
          target: 'https://scontent.cdninstagram.com', // Default Instagram CDN
          changeOrigin: true,
          secure: true,
          selfHandleResponse: true, // Handle response manually for dynamic routing
          configure: (proxy, options) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              const reqUrl = new URL(req.url || '', 'http://localhost');
              const videoUrl = reqUrl.searchParams.get('url');

              if (videoUrl) {
                try {
                  const parsed = new URL(videoUrl);
                  const isTikTok = parsed.hostname.includes('tiktok') || parsed.hostname.includes('musical.ly') || parsed.hostname.includes('tikwm');
                  const referer = isTikTok ? 'https://www.tiktok.com/' : 'https://www.instagram.com/';
                  const origin = isTikTok ? 'https://www.tiktok.com' : 'https://www.instagram.com';
                  proxyReq.setHeader('Host', parsed.hostname);
                  proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
                  proxyReq.setHeader('Referer', referer);
                  proxyReq.setHeader('Accept', '*/*');
                  proxyReq.setHeader('Accept-Language', 'en-US,en;q=0.9');
                  proxyReq.setHeader('Origin', origin);
                  console.log('[Video Proxy] Proxying to:', parsed.hostname, parsed.pathname.substring(0, 50) + '...');
                } catch (e) {
                  console.error('[Video Proxy] Invalid URL:', videoUrl);
                }
              }
            });

            // Handle response manually to support dynamic targets
            proxy.on('proxyRes', async (proxyRes, req, res) => {
              console.log('[Video Proxy] Response status:', proxyRes.statusCode);

              // Forward status and headers
              res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);

              // Pipe the response body
              proxyRes.pipe(res);
            });

            proxy.on('error', (err, req, res) => {
              console.error('[Video Proxy] Error:', err.message);
              if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
              }
              res.end(JSON.stringify({ error: 'Proxy error', message: err.message }));
            });
          },
          router: (req) => {
            // Dynamically determine target based on the URL parameter
            const reqUrl = new URL(req.url || '', 'http://localhost');
            const videoUrl = reqUrl.searchParams.get('url');
            if (videoUrl) {
              try {
                const parsed = new URL(videoUrl);
                const target = `${parsed.protocol}//${parsed.hostname}`;
                console.log('[Video Proxy Router] Target:', target);
                return target;
              } catch (e) {
                console.error('[Video Proxy] Failed to parse URL for routing');
              }
            }
            return 'https://scontent.cdninstagram.com'; // Fallback
          },
          rewrite: (path) => {
            // Extract the actual video path from the URL parameter
            const reqUrl = new URL(path, 'http://localhost');
            const videoUrl = reqUrl.searchParams.get('url');
            if (videoUrl) {
              try {
                const parsed = new URL(videoUrl);
                return parsed.pathname + parsed.search;
              } catch (e) {
                console.error('[Video Proxy] Failed to rewrite path');
              }
            }
            return path;
          }
        },
        '/api/fastsaver': {
          target: 'https://api.fastsaver.io',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/fastsaver/, '/v1'),
          secure: true,
          configure: (proxy, options) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              // Inject X-Api-Key header for FastSaver API authentication
              const apiKey = env.VITE_FASTSAVER_API_TOKEN;
              if (apiKey) {
                proxyReq.setHeader('X-Api-Key', apiKey);
              } else {
                console.warn('[FastSaver Proxy] Warning: VITE_FASTSAVER_API_TOKEN not set');
              }
              proxyReq.setHeader('Accept', 'application/json');

              console.log('[FastSaver Proxy] Proxying request:', req.url);
            });

            proxy.on('proxyRes', (proxyRes, req, res) => {
              console.log('[FastSaver Proxy] Response status:', proxyRes.statusCode);
            });

            proxy.on('error', (err, req, res) => {
              console.error('[FastSaver Proxy] Error:', err.message);
            });
          }
        },
        '/api/tikwm': {
          target: 'https://www.tikwm.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/tikwm/, '/api/'),
          secure: true,
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
    }
  };
});
