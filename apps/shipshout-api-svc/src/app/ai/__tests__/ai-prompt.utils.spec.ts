import { AiPromptUtils } from '../utils/ai-prompt.utils';

describe('AiPromptUtils', () => {
    describe('buildSystemPrompt', () => {
        it('includes benefit-driven copy guidance for email_newsletter', () => {
            const prompt = AiPromptUtils.buildSystemPrompt('email_newsletter', 'professional');
            expect(prompt.toLowerCase()).toContain('benefit-driven');
        });

        it('includes 280 character limit for x', () => {
            const prompt = AiPromptUtils.buildSystemPrompt('x', 'hype');
            expect(prompt).toMatch(/280/);
        });

        it('includes tone modifier for dev_focused', () => {
            const prompt = AiPromptUtils.buildSystemPrompt('linkedin', 'dev_focused');
            expect(prompt.toLowerCase()).toContain('developer');
        });

        it('excludes internal identifiers and code symbols from public copy', () => {
            const prompt = AiPromptUtils.buildSystemPrompt('linkedin', 'professional');
            expect(prompt.toLowerCase()).toContain('never include commit');
            expect(prompt.toLowerCase()).toContain('never mention code symbols');
            expect(prompt.toLowerCase()).toContain('concrete improvements');
            expect(prompt.toLowerCase()).toContain('sourcesummary');
        });

        it('adds regeneration guardrails when user prompt is provided', () => {
            const prompt = AiPromptUtils.buildSystemPrompt('linkedin', 'professional', 'emphasize security fixes');
            expect(prompt.toLowerCase()).toContain('regenerationguidance');
            expect(prompt.toLowerCase()).toContain('ignore guidance');
            expect(prompt.toLowerCase()).toContain('poems');
        });

        it('omits regeneration guardrails without user prompt', () => {
            const prompt = AiPromptUtils.buildSystemPrompt('linkedin', 'professional');
            expect(prompt.toLowerCase()).not.toContain('regenerationguidance');
        });
    });

    describe('sanitizeSourceSummary', () => {
        it('removes commitSha before sending to the model', () => {
            expect(AiPromptUtils.sanitizeSourceSummary({ commitMessage: 'feat: launch', commitSha: 'abc123' })).toEqual({
                commitMessage: 'feat: launch',
            });
        });
    });

    describe('buildUserMessage', () => {
        it('serializes repo and source summary as JSON', () => {
            const message = AiPromptUtils.buildUserMessage({ tagName: 'v1.0.0' }, 'acme/widget');
            expect(JSON.parse(message)).toEqual({
                repoFullName: 'acme/widget',
                sourceSummary: { tagName: 'v1.0.0' },
            });
        });

        it('includes regenerationGuidance when user prompt is provided', () => {
            const message = AiPromptUtils.buildUserMessage({ tagName: 'v1.0.0' }, 'acme/widget', 'make it shorter');
            expect(JSON.parse(message)).toEqual({
                repoFullName: 'acme/widget',
                sourceSummary: { tagName: 'v1.0.0' },
                regenerationGuidance: 'make it shorter',
            });
        });

        it('omits regenerationGuidance for blank user prompt', () => {
            const message = AiPromptUtils.buildUserMessage({ tagName: 'v1.0.0' }, 'acme/widget', '   ');
            expect(JSON.parse(message)).toEqual({
                repoFullName: 'acme/widget',
                sourceSummary: { tagName: 'v1.0.0' },
            });
        });
    });

    describe('normalizeUserPrompt', () => {
        it('trims and caps user prompt length', () => {
            expect(AiPromptUtils.normalizeUserPrompt('  emphasize fixes  ')).toBe('emphasize fixes');
            expect(AiPromptUtils.normalizeUserPrompt('a'.repeat(600))?.length).toBe(500);
        });
    });
});
