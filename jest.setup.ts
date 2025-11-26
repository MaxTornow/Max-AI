/**
 * Jest Setup File
 * Configures global mocks and environment for tests
 */

// Mock import.meta.env for Vite environment variables
Object.defineProperty(globalThis, 'import', {
  value: {
    meta: {
      env: {
        VITE_SUBMAGIC_API_URL: 'https://api.submagic.co/v1',
        VITE_SUBMAGIC_API_KEY: 'sk-test-api-key',
        VITE_SUBMAGIC_POLL_INTERVAL_MS: '5000',
        MODE: 'test',
        DEV: false,
        PROD: false,
      },
    },
  },
  writable: true,
});

// Also set process.env for fallback
process.env.VITE_SUBMAGIC_API_URL = 'https://api.submagic.co/v1';
process.env.VITE_SUBMAGIC_API_KEY = 'sk-test-api-key';
process.env.VITE_SUBMAGIC_POLL_INTERVAL_MS = '5000';
