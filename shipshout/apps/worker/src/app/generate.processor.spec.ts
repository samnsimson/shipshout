import { GenerateProcessor } from './generate.processor';
import { Channel } from '@shipshout/database';

describe('GenerateProcessor', () => {
    it('delegates to GenerationService with default channels', async () => {
        const gen = { generateForEvent: jest.fn(async () => []) };
        const proc = new GenerateProcessor(gen as any);
        await proc.process({ data: { releaseEventId: 'e1' } } as any);
        expect(gen.generateForEvent).toHaveBeenCalledWith('e1', [Channel.X, Channel.LinkedIn, Channel.Email]);
    });
});
