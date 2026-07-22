module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  moduleNameMapper: {
    '@/(.*)$': '<rootDir>/src/$1',
    '@data/(.*)$': '<rootDir>/src/data/$1',
    '@types/(.*)$': '<rootDir>/src/types/$1',
    '@utils/(.*)$': '<rootDir>/src/utils/$1',
    '@background/(.*)$': '<rootDir>/src/background/$1',
    '@content/(.*)$': '<rootDir>/src/content/$1',
  },
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
    },
  },
  setupFiles: ['<rootDir>/jest.setup.js'],
};
