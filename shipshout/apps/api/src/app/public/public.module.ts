import { Module } from '@nestjs/common';
import Redis from 'ioredis';
import { AiEngine, ClaudeProvider, OpenAiProvider } from '@shipshout/ai';
import { CounterStore, RateLimiter } from '@shipshout/shared-util';
import { PublicController } from './public.controller';
import { PublicGenerateService } from './public-generate.service';

function redisCounterStore(): CounterStore {
    const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');
    return {
        incr: (key: string) => redis.incr(key),
        expire: (key: string, seconds: number) => redis.expire(key, seconds).then(() => undefined),
    };
}

@Module({
    controllers: [PublicController],
    providers: [
        {
            provide: AiEngine,
            useFactory: () => new AiEngine(new OpenAiProvider(), new ClaudeProvider()),
        },
        {
            provide: RateLimiter,
            useFactory: () => new RateLimiter(redisCounterStore(), 5, 3600),
        },
        PublicGenerateService,
    ],
})
export class PublicModule {}
