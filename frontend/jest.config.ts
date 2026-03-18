import type { Config } from 'jest';

const config: Config = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testEnvironment: 'jsdom',
  testMatch: ['**/src/**/*.spec.ts'],
  transform: {
    '^.+\\.(ts|js|mjs|html|svg)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        stringifyContentPathRegex: '\\.(html|svg)$',
      },
    ],
  },
  moduleNameMapper: {
    '@charts/(.*)': '<rootDir>/src/app/_charts/$1',
    '@dashboard/(.*)': '<rootDir>/src/app/dashboard/$1',
    '@models/(.*)': '<rootDir>/src/models/$1',
    '@constants/(.*)': '<rootDir>/src/constants/$1',
    '@directives/(.*)': '<rootDir>/src/directives/$1',
    '@guards/(.*)': '<rootDir>/src/guards/$1',
    '@shards/(.*)': '<rootDir>/src/app/_shards/$1',
    '@activity/(.*)': '<rootDir>/src/app/_activity/$1',
    '@app/(.*)': '<rootDir>/src/app/$1',
  },
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/main.ts',
    '!src/environments/**',
  ],
};

export default config;
