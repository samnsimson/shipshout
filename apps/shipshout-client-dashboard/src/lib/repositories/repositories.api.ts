import { ApiClientFactory } from '@/lib/api/api-client.factory';

export class RepositoriesApi {
    static async getGithubConnection() {
        return ApiClientFactory.fetchProtected((api) => api.getGithubConnection());
    }

    static async listAvailableRepos() {
        return ApiClientFactory.fetchProtected((api) => api.listAvailableRepos());
    }

    static async listLinkedRepos() {
        return ApiClientFactory.fetchProtected((api) => api.listLinkedRepos());
    }

    static async disconnectGithub() {
        return ApiClientFactory.fetchProtected((api) => api.disconnectGithub());
    }

    static async linkRepositories(githubIds: number[]) {
        return ApiClientFactory.fetchProtected((api) => api.linkRepositories({ body: { githubIds } }));
    }

    static async unlinkRepository(id: string) {
        return ApiClientFactory.fetchProtected((api) => api.unlinkRepository({ path: { id } }));
    }
}
