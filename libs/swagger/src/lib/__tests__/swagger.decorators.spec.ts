import { ApiResource, humanizeOperationId } from '../swgger.decorators';

describe('ApiResource', () => {
    it('returns a composed method decorator', () => {
        class ResponseDto {}
        class RequestDto {}

        const decorator = ApiResource({
            operationId: 'linkRepositories',
            status: 201,
            response: ResponseDto,
            body: RequestDto,
            errors: [{ status: 400, description: 'Bad request' }],
        });

        expect(typeof decorator).toBe('function');
    });
});

describe('humanizeOperationId', () => {
    it('formats camelCase operation ids for OpenAPI summaries', () => {
        expect(humanizeOperationId('getGithubConnection')).toBe('Get Github Connection');
        expect(humanizeOperationId('linkRepositories')).toBe('Link Repositories');
    });
});
