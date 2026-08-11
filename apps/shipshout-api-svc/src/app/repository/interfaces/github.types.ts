export type GithubRepoSummary = {
    githubId: number;
    fullName: string;
    name: string;
    owner: string;
    defaultBranch: string;
    private: boolean;
    htmlUrl: string;
};

export type GithubOAuthTokenResponse = {
    access_token: string;
    token_type: string;
    scope?: string;
};

export type GithubUserResponse = {
    id: number;
    login: string;
};

export type GithubApiRepo = {
    id: number;
    full_name: string;
    name: string;
    default_branch: string;
    private: boolean;
    html_url: string;
    owner: { login: string };
};

export type GithubOrgResponse = {
    login: string;
};
