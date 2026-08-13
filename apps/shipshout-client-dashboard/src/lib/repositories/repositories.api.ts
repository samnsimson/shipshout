import { ShipshoutApi } from '@/lib/shipshout.api';

export class RepositoriesApi {
    static getClient() {
        return ShipshoutApi.getApiClient();
    }

    static async disconnectGithub() {
        const { api, requestOptions } = await RepositoriesApi.getClient();
        return api.disconnectGithub(requestOptions);
    }

    static async linkRepositories(githubIds: number[]) {
        const { api, requestOptions } = await RepositoriesApi.getClient();
        return api.linkRepositories({ ...requestOptions, body: { githubIds } });
    }

    static async unlinkRepository(id: string) {
        const { api, requestOptions } = await RepositoriesApi.getClient();
        return api.unlinkRepository({ ...requestOptions, path: { id } });
    }
}
