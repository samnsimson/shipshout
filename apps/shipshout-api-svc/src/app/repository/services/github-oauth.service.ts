import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';

type OAuthStatePayload = {
    userId: string;
    exp: number;
};

@Injectable()
export class GithubOAuthService {
    private readonly clientId: string;
    private readonly clientSecret: string;
    private readonly callbackUrl: string;
    private readonly clientAppUrl: string;
    private readonly stateSecret: string;
    private readonly scopes = ['read:user', 'repo', 'read:org'];

    constructor(private readonly configService: ConfigService) {
        this.clientId =
            this.configService.get<string>('GITHUB_REPO_CLIENT_ID') ??
            this.configService.getOrThrow<string>('GITHUB_CLIENT_ID');
        this.clientSecret =
            this.configService.get<string>('GITHUB_REPO_CLIENT_SECRET') ??
            this.configService.getOrThrow<string>('GITHUB_CLIENT_SECRET');
        const baseUrl = this.configService.getOrThrow<string>('BETTER_AUTH_BASE_URL').replace(/\/$/, '');
        this.callbackUrl = this.configService.get<string>('GITHUB_REPO_OAUTH_CALLBACK_URL') ?? `${baseUrl}/repositories/github/callback`;
        this.clientAppUrl = this.configService.getOrThrow<string>('CLIENT_APP_URL').replace(/\/$/, '');
        this.stateSecret = this.configService.getOrThrow<string>('BETTER_AUTH_SECRET');
    }

    getAuthorizationUrl(userId: string): string {
        const state = this.signState(userId);
        const params = new URLSearchParams({
            client_id: this.clientId,
            redirect_uri: this.callbackUrl,
            scope: this.scopes.join(' '),
            state,
        });
        return `https://github.com/login/oauth/authorize?${params.toString()}`;
    }

    getSuccessRedirectUrl(): string {
        return `${this.clientAppUrl}/dashboard/repositories?github=connected`;
    }

    getFailureRedirectUrl(reason: string): string {
        return `${this.clientAppUrl}/dashboard/repositories?github=error&reason=${encodeURIComponent(reason)}`;
    }

    getCallbackUrl(): string {
        return this.callbackUrl;
    }

    verifyState(state: string): OAuthStatePayload {
        const [payloadPart, signaturePart] = state.split('.');
        if (!payloadPart || !signaturePart) throw new BadRequestException('Invalid OAuth state');

        const expected = createHmac('sha256', this.stateSecret).update(payloadPart).digest('base64url');
        const actualBuffer = Buffer.from(signaturePart);
        const expectedBuffer = Buffer.from(expected);
        if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer))
            throw new BadRequestException('Invalid OAuth state');

        const payload = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8')) as OAuthStatePayload;
        if (!payload.userId || !payload.exp) throw new BadRequestException('Invalid OAuth state');
        if (payload.exp < Date.now()) throw new BadRequestException('OAuth state expired');
        return payload;
    }

    async exchangeCode(code: string): Promise<{ accessToken: string; scopes: string | null }> {
        const response = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                client_id: this.clientId,
                client_secret: this.clientSecret,
                code,
                redirect_uri: this.callbackUrl,
            }),
        });

        if (!response.ok) throw new BadRequestException('Failed to exchange GitHub authorization code');

        const body = (await response.json()) as { access_token?: string; scope?: string; error?: string; error_description?: string };
        if (!body.access_token) throw new BadRequestException(body.error_description ?? body.error ?? 'Missing GitHub access token');
        return { accessToken: body.access_token, scopes: body.scope ?? null };
    }

    private signState(userId: string): string {
        const payloadPart = Buffer.from(
            JSON.stringify({
                userId,
                exp: Date.now() + 10 * 60 * 1000,
            } satisfies OAuthStatePayload),
        ).toString('base64url');
        const signaturePart = createHmac('sha256', this.stateSecret).update(payloadPart).digest('base64url');
        return `${payloadPart}.${signaturePart}`;
    }
}
