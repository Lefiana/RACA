// File: apps/backend/jest.config.e2e.js

/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts', 'mjs'],
  rootDir: '.',
  testMatch: ['<rootDir>/test/e2e/**/*.e2e-spec.ts'],
  
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.test.json',
      // Ensure ts-jest treats ESM correctly
      useESM: true,
    }],
    '^.+\\.mjs$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.test.json',
      useESM: true,
    }],
  },

  // FIX: Explicitly ignore everything EXCEPT the problematic package
  // The negative lookahead (?!(...)) is the key here.
  transformIgnorePatterns: [
    '/node_modules/(?!(@thallesp/nestjs-better-auth)/)',
  ],

  testTimeout: 60_000,
  maxWorkers: 1,
  moduleNameMapper: {
    '^@repo/database$': '<rootDir>/../../packages/database/index.ts',
  },
};