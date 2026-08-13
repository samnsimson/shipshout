import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
    input: 'http://localhost:8000/docs/openapi.json',
    output: 'libs/api-client/src/lib/client',
    plugins: [
        '@hey-api/typescript',
        { name: '@hey-api/client-next', runtimeConfigPath: './libs/api-client/src/hey-api.config.js' },
        { name: '@hey-api/sdk', operations: { containerName: 'ApiClient', strategy: 'single' } },
    ],
});
