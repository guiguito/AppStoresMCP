module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(google-play-scraper-ts|app-store-scraper-ts)/)'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 30000,
  setupFilesAfterEnv: ['<rootDir>/tests/setup.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testEnvironmentOptions: {
    NODE_ENV: 'test'
  },
  moduleNameMapper: {
    '^app-store-scraper-ts$': '<rootDir>/tests/__mocks__/app-store-scraper-ts.ts',
    '^google-play-scraper-ts$': '<rootDir>/tests/__mocks__/google-play-scraper-ts.ts'
  }
};