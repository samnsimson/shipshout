export class AiPromptUtils {
    static buildSystemPrompt(channelKey: string, tone: string): string {
        const toneInstruction = AiPromptUtils.toneInstruction(tone);
        const channelInstruction = AiPromptUtils.channelInstruction(channelKey);

        return [
            'You write shoutout copy for software release announcements.',
            channelInstruction,
            toneInstruction,
            'Respond with JSON only: { "title": string, "body": string }.',
        ].join(' ');
    }

    static buildUserMessage(sourceSummary: Record<string, unknown>, repoFullName: string): string {
        return JSON.stringify({ repoFullName, sourceSummary }, null, 2);
    }

    private static channelInstruction(channelKey: string): string {
        switch (channelKey) {
            case 'email_newsletter':
                return 'Write benefit-driven newsletter copy with an HTML-friendly body paragraph.';
            case 'x':
                return 'Write a punchy post for X (Twitter) with body at most 280 characters including spaces.';
            case 'linkedin':
                return 'Write a professional LinkedIn post in one to three short paragraphs.';
            default:
                return 'Write concise announcement copy appropriate for the channel.';
        }
    }

    private static toneInstruction(tone: string): string {
        switch (tone) {
            case 'dev_focused':
                return 'Use a developer-focused tone highlighting technical changes and impact.';
            case 'hype':
                return 'Use an energetic, hype-driven tone while staying credible.';
            case 'professional':
            default:
                return 'Use a clear, professional tone.';
        }
    }
}
