import { ApiClient } from '@shipshout/api-client';

export class RepositoriesApi {
    static async getGithubConnection() {
        return ApiClient.fetchProtected((api) => api.getGithubConnection());
    }

    static async listAvailableRepos() {
        return ApiClient.fetchProtected((api) => api.listAvailableRepos());
    }

    static async listLinkedRepos() {
        return ApiClient.fetchProtected((api) => api.listLinkedRepos());
    }

    static async disconnectGithub() {
        return ApiClient.fetchProtected((api) => api.disconnectGithub());
    }

    static async linkRepositories(githubIds: number[]) {
        return ApiClient.fetchProtected((api) => api.linkRepositories({ body: { githubIds } }));
    }

    static async unlinkRepository(id: string) {
        return ApiClient.fetchProtected((api) => api.unlinkRepository({ path: { id } }));
    }
}
