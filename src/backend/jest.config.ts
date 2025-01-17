import type { Config } from '@jest/types';
import { compilerOptions } from './tsconfig.json';

/**
 * Root Jest configuration for backend services
 * @version 29.5.0
 */
const config: Config.InitialOptions = {
  // Use ts-jest preset for TypeScript support
  preset: 'ts-jest',

  // Use Node.js test environment
  testEnvironment: 'node',

  // Define test file locations
  roots: ['<rootDir>/src', '<rootDir>/test'],

  // Test file patterns to match
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],

  // TypeScript file transformation
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },

  // Module path aliases mapping
  moduleNameMapper: {
    '@shared/(.*)': '<rootDir>/shared/$1',
    '@types/(.*)': '<rootDir>/shared/types/$1',
    '@utils/(.*)': '<rootDir>/shared/utils/$1',
    '@constants/(.*)': '<rootDir>/shared/constants/$1',
    '@schemas/(.*)': '<rootDir>/shared/database/schemas/$1'
  },

  // Code coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // Test setup and environment configuration
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  verbose: true,
  testTimeout: 30000,
  maxWorkers: '50%',

  // Ignore patterns
  modulePathIgnorePatterns: [
    '<rootDir>/dist/',
    '<rootDir>/node_modules/'
  ],

  // Global settings
  globals: {
    'ts-jest': {
      tsconfig: compilerOptions
    }
  },

  // Reporter configuration
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'coverage',
      outputName: 'junit.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}'
    }]
  ]
};

export default config;