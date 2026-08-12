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
    });

    describe('buildUserMessage', () => {
        it('serializes repo and source summary as JSON', () => {
            const message = AiPromptUtils.buildUserMessage({ tagName: 'v1.0.0' }, 'acme/widget');
            expect(JSON.parse(message)).toEqual({
                repoFullName: 'acme/widget',
                sourceSummary: { tagName: 'v1.0.0' },
            });
        });
    });
});
