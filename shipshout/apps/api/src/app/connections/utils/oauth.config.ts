import { Channel } from '@shipshout/database';

export function channelSlug(channel: Channel): string {
    return channel;
}

type OAuthConfig = {
    authUrl: string;
    tokenUrl: string;
    clientId: string;
    clientSecret: string;
    scopes: string;
};

const CONFIG: Partial<Record<Channel, () => OAuthConfig>> = {
    [Channel.X]: () => ({
        authUrl: 'https://twitter.com/i/oauth2/authorize',
        tokenUrl: 'https://api.twitter.com/2/oauth2/token',
        clientId: process.env.X_CLIENT_ID ?? '',
        clientSecret: process.env.X_CLIENT_SECRET ?? '',
        scopes: 'tweet.read tweet.write users.read offline.access',
    }),
    [Channel.LinkedIn]: () => ({
        authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
        tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
        clientId: process.env.LINKEDIN_CLIENT_ID ?? '',
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET ?? '',
        scopes: 'w_member_social',
    }),
    [Channel.Buffer]: () => ({
        authUrl: 'https://bufferapp.com/oauth2/authorize',
        tokenUrl: 'https://api.bufferapp.com/1/oauth2/token.json',
        clientId: process.env.BUFFER_CLIENT_ID ?? '',
        clientSecret: process.env.BUFFER_CLIENT_SECRET ?? '',
        scopes: 'publish',
    }),
    [Channel.Mailchimp]: () => ({
        authUrl: 'https://login.mailchimp.com/oauth2/authorize',
        tokenUrl: 'https://login.mailchimp.com/oauth2/token',
        clientId: process.env.MAILCHIMP_CLIENT_ID ?? '',
        clientSecret: process.env.MAILCHIMP_CLIENT_SECRET ?? '',
        scopes: 'campaigns',
    }),
};

export function channelOAuthConfig(channel: Channel): OAuthConfig {
    const factory = CONFIG[channel];
    if (!factory) throw new Error(`OAuth not configured for ${channel}`);
    return factory();
}

export function parseChannel(raw: string): Channel {
    const values = Object.values(Channel) as string[];
    if (!values.includes(raw)) throw new Error(`Unknown channel: ${raw}`);
    return raw as Channel;
}
