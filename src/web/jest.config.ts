import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  // Test environment configuration
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],

  // Module resolution and import mapping
  moduleNameMapper: {
    // Path aliases
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    
    // Asset mocks
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/test/mocks/fileMock.ts'
  },

  // Code coverage configuration
  coverageDirectory: '<rootDir>/coverage',
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
    '!src/vite-env.d.ts',
    '!src/**/index.ts',
    '!src/main.tsx',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/__mocks__/**'
  ],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80
    }
  },

  // Test file configuration
  testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/.vite/'
  ],

  // TypeScript configuration
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      isolatedModules: true,
      diagnostics: {
        ignoreCodes: ['TS151001']
      }
    }]
  },

  // Watch mode plugins
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],

  // Global configuration
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json'
    }
  },

  // Mock behavior
  resetMocks: true,
  clearMocks: true,
  restoreMocks: true
};

export default config;