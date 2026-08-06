import { buildPrompt, CHANNEL_CONSTRAINTS } from '../../utils/build-prompt';
import { Tone, Channel } from '@shipshout/database';

describe('buildPrompt', () => {
    const base = {
        commitSummary: 'Refactored auth middleware for OAuth2 PKCE flow',
        tone: Tone.HypeStartup,
        emojiPolicy: true,
    };
    it('includes the commit summary and channel format in the prompt', () => {
        const { system, user } = buildPrompt({ ...base, channel: Channel.X });
        expect(user).toContain('OAuth2 PKCE');
        expect(system).toContain('X (Twitter)');
    });
    it('mentions the char limit for X', () => {
        expect(CHANNEL_CONSTRAINTS[Channel.X].maxChars).toBe(280);
        const { system } = buildPrompt({ ...base, channel: Channel.X });
        expect(system).toContain('280');
    });
    it('suppresses emojis when emojiPolicy is false', () => {
        const { system } = buildPrompt({ ...base, emojiPolicy: false, channel: Channel.LinkedIn });
        expect(system.toLowerCase()).toContain('do not use emojis');
    });
});
