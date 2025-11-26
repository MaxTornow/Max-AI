/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    // Handle module aliases to match tsconfig.json paths
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@pages/(.*)$': '<rootDir>/src/pages/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@context/(.*)$': '<rootDir>/src/context/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@assets/(.*)$': '<rootDir>/src/assets/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
    }],
  },
  // Indicates which file extensions Jest should look for
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  // The root directory that Jest should scan for tests and modules
  rootDir: '.',
  // The test match pattern
  testMatch: ['**/__tests__/**/*.test.(ts|tsx|js)'],
  // Setup for import.meta.env (Vite environment variables)
  globals: {
    'import.meta': {
      env: {
        VITE_SUBMAGIC_API_URL: 'https://api.submagic.co/v1',
        VITE_SUBMAGIC_API_KEY: 'test-api-key',
      },
    },
  },
};
