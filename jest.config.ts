import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: 'tsconfig.spec.json' }],
  },
  testEnvironment: 'node',
  collectCoverageFrom: ['src/**/*.(t|j)s'],
  coverageDirectory: 'coverage',
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
};
export default config;
