import { Tone, Channel } from '@shipshout/database';
import { CHANNEL_CONSTRAINTS } from './channel-constraints.js';

export { CHANNEL_CONSTRAINTS };

const TONE_TEXT: Record<Tone, string> = {
    [Tone.DevFocused]: 'technical but accessible, aimed at developers',
    [Tone.Professional]: 'polished, professional, benefit-driven',
    [Tone.HypeStartup]: 'energetic, hype startup voice',
};

export function buildPrompt(input: { commitSummary: string; tone: Tone; customInstructions?: string; emojiPolicy: boolean; channel: Channel }): {
    system: string;
    user: string;
} {
    const c = CHANNEL_CONSTRAINTS[input.channel];
    const limit = c.maxChars ? ` Keep it under ${c.maxChars} characters.` : '';
    const emoji = input.emojiPolicy ? 'You may use tasteful emojis.' : 'Do not use emojis.';
    const custom = input.customInstructions ? ` Brand guidance: ${input.customInstructions}.` : '';
    const system = [
        `You are ShipShout, turning technical release notes into ${c.label} marketing copy.`,
        `Write ${c.format}.${limit}`,
        `Voice: ${TONE_TEXT[input.tone]}.`,
        emoji + custom,
        'Focus on customer benefits, not jargon. Output only the copy.',
    ].join(' ');
    const user = `Release notes / commits:\n${input.commitSummary}`;
    return { system, user };
}
