import { AiGenerationService } from '../services/ai-generation.service';
import type { AiProvider } from '../providers/ai-provider.interface';
import { AI_PROVIDER } from '../constants/ai.constants';

describe('AiGenerationService', () => {
    let service: AiGenerationService;
    let mockProvider: jest.Mocked<AiProvider>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockProvider = {
            generateChannelVariants: jest.fn().mockResolvedValue({ email_newsletter: { title: 'Release v1', body: 'We shipped.' } }),
        };
        service = new AiGenerationService(mockProvider);
    });

    it('skips email_alert when generating variants', async () => {
        const input = {
            sourceSummary: { tagName: 'v1.0.0' },
            channels: [
                { key: 'email_alert', tone: 'professional' },
                { key: 'email_newsletter', tone: 'professional' },
            ],
            repoFullName: 'acme/widget',
        };

        await service.generateVariants(input);

        expect(mockProvider.generateChannelVariants).toHaveBeenCalledWith({
            ...input,
            channels: [{ key: 'email_newsletter', tone: 'professional' }],
        });
    });

    it('returns provider variants', async () => {
        const result = await service.generateVariants({
            sourceSummary: { tagName: 'v1.0.0' },
            channels: [{ key: 'email_newsletter', tone: 'professional' }],
            repoFullName: 'acme/widget',
        });

        expect(result).toEqual({ email_newsletter: { title: 'Release v1', body: 'We shipped.' } });
    });

    it('uses the injected AI_PROVIDER token shape', () => {
        expect(AI_PROVIDER).toBeDefined();
        expect(service).toBeInstanceOf(AiGenerationService);
    });
});
