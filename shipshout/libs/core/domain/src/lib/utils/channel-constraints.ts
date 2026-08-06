import { Channel } from '@shipshout/database';

export const CHANNEL_CONSTRAINTS: Record<Channel, { maxChars?: number; format: string; label: string }> = {
    [Channel.X]: { maxChars: 280, format: 'a single punchy tweet', label: 'X (Twitter)' },
    [Channel.LinkedIn]: {
        maxChars: 1300,
        format: 'a professional LinkedIn post with a hook and short paragraphs',
        label: 'LinkedIn',
    },
    [Channel.Email]: {
        format: 'a concise email newsletter blurb with a subject line',
        label: 'Email',
    },
    [Channel.Buffer]: { maxChars: 280, format: 'a short social post', label: 'Buffer' },
    [Channel.Mailchimp]: { format: 'an email newsletter blurb', label: 'Mailchimp' },
};
