import { createSign } from 'crypto';

function base64Url(input: Buffer | string) {
    const buf = typeof input === 'string' ? Buffer.from(input) : input;
    return buf.toString('base64url');
}

/** Mint a short-lived JWT for GitHub App API calls. */
export function createGithubAppJwt(appId: string, privateKeyPem: string): string {
    const now = Math.floor(Date.now() / 1000);
    const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const payload = base64Url(JSON.stringify({ iat: now - 60, exp: now + 600, iss: appId }));
    const unsigned = `${header}.${payload}`;
    const key = privateKeyPem.replace(/\\n/g, '\n');
    const sign = createSign('RSA-SHA256');
    sign.update(unsigned);
    return `${unsigned}.${sign.sign(key, 'base64url')}`;
}

export type GithubRepoSummary = { id: number; full_name: string; permissions?: { admin?: boolean; push?: boolean } };

export async function fetchGithubRepos(accessToken: string): Promise<GithubRepoSummary[]> {
    const repos: GithubRepoSummary[] = [];
    let page = 1;
    for (;;) {
        const res = await fetch(`https://api.github.com/user/repos?affiliation=owner,collaborator,organization_member&per_page=100&page=${page}`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
            },
        });
        if (!res.ok) throw new Error(`GitHub repos fetch failed: ${res.status}`);
        const batch = (await res.json()) as GithubRepoSummary[];
        repos.push(...batch);
        if (batch.length < 100) break;
        page++;
    }
    return repos.filter((r) => r.permissions?.admin || r.permissions?.push);
}

export async function fetchInstallationAccessToken(installationId: string, appJwt: string): Promise<string> {
    const tokenRes = await fetch(`https://api.github.com/app/installations/${installationId}/access_tokens`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${appJwt}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
        },
    });
    if (!tokenRes.ok) throw new Error(`GitHub installation token failed: ${tokenRes.status}`);
    const { token } = (await tokenRes.json()) as { token: string };
    return token;
}

export async function fetchInstallationReposWithToken(token: string): Promise<GithubRepoSummary[]> {
    const repos: GithubRepoSummary[] = [];
    let page = 1;
    for (;;) {
        const res = await fetch(`https://api.github.com/installation/repositories?per_page=100&page=${page}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
            },
        });
        if (!res.ok) throw new Error(`GitHub installation repos failed: ${res.status}`);
        const body = (await res.json()) as { repositories: GithubRepoSummary[] };
        repos.push(...body.repositories);
        if (body.repositories.length < 100) break;
        page++;
    }
    return repos;
}

export async function fetchInstallationRepos(installationId: string, appJwt: string): Promise<GithubRepoSummary[]> {
    const token = await fetchInstallationAccessToken(installationId, appJwt);
    return fetchInstallationReposWithToken(token);
}

export async function registerGithubWebhook(fullName: string, accessToken: string, webhookUrl: string, secret: string) {
    const res = await fetch(`https://api.github.com/repos/${fullName}/hooks`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            name: 'web',
            active: true,
            events: ['release'],
            config: { url: webhookUrl, content_type: 'json', secret },
        }),
    });
    if (res.status === 422) return;
    if (!res.ok) throw new Error(`GitHub webhook create failed for ${fullName}: ${res.status}`);
}

export async function exchangeGithubCode(code: string, redirectUri: string): Promise<string> {
    const res = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
            client_id: process.env.GITHUB_CLIENT_ID,
            client_secret: process.env.GITHUB_CLIENT_SECRET,
            code,
            redirect_uri: redirectUri,
        }),
    });
    if (!res.ok) throw new Error(`GitHub token exchange failed: ${res.status}`);
    const data = (await res.json()) as { access_token?: string; error?: string };
    if (!data.access_token) throw new Error(data.error ?? 'GitHub token exchange failed');
    return data.access_token;
}
