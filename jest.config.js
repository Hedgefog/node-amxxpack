/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '@builder': '<rootDir>/src/builder',
    '@common': '<rootDir>/src/common',
    '@logger': '<rootDir>/src/logger',
    '@cli': '<rootDir>/src/cli',
    '@compiler': '<rootDir>/src/compiler',
    '@project-config': '<rootDir>/src/project-config',
    '@utils': '<rootDir>/src/utils',
    '@template': '<rootDir>/src/template'
  }
};
