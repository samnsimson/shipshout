const nextJest = require('next/jest.js');

const createJestConfig = nextJest({
    dir: './',
});

const config = {
    displayName: 'shipshout-client-dashboard',
    preset: '../../jest.preset.js',
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
    coverageDirectory: '../../coverage/apps/shipshout-client-dashboard',
    testEnvironment: 'jsdom',
    testMatch: ['**/specs/**/*.(spec|test).(ts|tsx|js|jsx)', '**/__tests__/**/*.(spec|test).(ts|tsx|js|jsx)'],
};

module.exports = createJestConfig(config);
