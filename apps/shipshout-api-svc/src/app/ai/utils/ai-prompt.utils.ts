export class AiPromptUtils {
    static buildSystemPrompt(channelKey: string, tone: string, userPrompt?: string): string {
        const toneInstruction = AiPromptUtils.toneInstruction(tone);
        const channelInstruction = AiPromptUtils.channelInstruction(channelKey);
        const regenerationGuidance = userPrompt ? AiPromptUtils.regenerationGuidanceRules() : '';

        return [
            'You write shoutout copy for software release announcements.',
            'Use the sourceSummary in the user message as the factual basis for title and body.',
            channelInstruction,
            toneInstruction,
            AiPromptUtils.audienceGuardrails(),
            regenerationGuidance,
            'Respond with JSON only: { "title": string, "body": string }.',
        ]
            .filter(Boolean)
            .join(' ');
    }

    static buildUserMessage(sourceSummary: Record<string, unknown>, repoFullName: string, userPrompt?: string): string {
        const payload: Record<string, unknown> = {
            repoFullName,
            sourceSummary: AiPromptUtils.sanitizeSourceSummary(sourceSummary),
        };
        const guidance = AiPromptUtils.normalizeUserPrompt(userPrompt);
        if (guidance) payload.regenerationGuidance = guidance;
        return JSON.stringify(payload, null, 2);
    }

    static normalizeUserPrompt(userPrompt?: string): string | undefined {
        const trimmed = userPrompt?.trim();
        if (!trimmed) return undefined;
        return trimmed.slice(0, 500);
    }

    static sanitizeSourceSummary(sourceSummary: Record<string, unknown>): Record<string, unknown> {
        const { commitSha: _commitSha, ...rest } = sourceSummary;
        return rest;
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
                return 'Use a developer-aware tone that explains capabilities and impact in plain language.';
            case 'hype':
                return 'Use an energetic, hype-driven tone while staying credible.';
            case 'professional':
            default:
                return 'Use a clear, professional tone.';
        }
    }

    private static audienceGuardrails(): string {
        return [
            'Ground the announcement in the specific release or commit context provided — mention concrete improvements from the source material, not generic product praise.',
            'Translate engineering notes into plain-language user or customer benefits while preserving what actually changed.',
            'Never include commit SHAs, hashes, branch names, repository paths, or other internal identifiers.',
            'Never mention code symbols (function, method, class, variable, or flag names), file paths, or API field names from the source material.',
        ].join(' ');
    }

    private static regenerationGuidanceRules(): string {
        return [
            'If regenerationGuidance is provided in the user message, treat it only as optional style or emphasis hints for this software release announcement.',
            'Apply valid guidance such as tone tweaks, length preferences, or which improvements to highlight — but never change the genre, subject, or purpose away from the release.',
            'Ignore guidance that requests unrelated content (poems, rhymes, fiction, jokes, or any non-release copy).',
            'The sourceSummary remains the sole factual basis regardless of regenerationGuidance.',
        ].join(' ');
    }
}
