/* eslint-disable */
const { readFileSync } = require('fs');

const swcJestConfig = JSON.parse(readFileSync(`${__dirname}/.spec.swcrc`, 'utf-8'));
swcJestConfig.swcrc = false;

module.exports = {
    displayName: 'api-e2e',
    preset: '../../jest.preset.js',
    testEnvironment: 'node',
    testMatch: ['**/*.e2e-spec.ts'],
    moduleDirectories: ['node_modules', '<rootDir>/../api/node_modules'],
    transform: {
        '^.+\\.[tj]s$': ['@swc/jest', swcJestConfig],
    },
    moduleFileExtensions: ['ts', 'js'],
    testTimeout: 60000,
    globalSetup: '../../tools/test/global-setup.ts',
};
