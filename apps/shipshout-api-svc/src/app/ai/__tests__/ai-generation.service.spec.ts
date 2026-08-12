import { ConfigService } from '@nestjs/config';
import { AiGenerationService } from '../services/ai-generation.service';
import type { AiProvider } from '../providers/ai-provider.interface';

describe('AiGenerationService', () => {
    const config = {
        get: jest.fn(),
        getOrThrow: jest.fn(),
    };
    let service: AiGenerationService;
    let mockProvider: jest.Mocked<AiProvider>;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new AiGenerationService(config as unknown as ConfigService);
        mockProvider = {
            generateChannelVariants: jest.fn().mockResolvedValue({ email_newsletter: { title: 'Release v1', body: 'We shipped.' } }),
        };
        jest.spyOn(service as unknown as { resolveProvider: () => AiProvider }, 'resolveProvider').mockReturnValue(mockProvider);
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

    it('throws for unsupported AI_PROVIDER', () => {
        const bareService = new AiGenerationService(config as unknown as ConfigService);
        config.get.mockReturnValue('anthropic');

        expect(() => (bareService as unknown as { resolveProvider: () => AiProvider }).resolveProvider()).toThrow('Unsupported AI_PROVIDER: anthropic');
    });
});
