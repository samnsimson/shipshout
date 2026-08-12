import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export type ShoutoutStreamEvent = {
    status: string;
    channelKey?: string;
    error?: string;
};

@Injectable()
export class ShoutoutEventsService implements OnModuleDestroy {
    private readonly publisher: Redis;
    private readonly subscriber: Redis;

    constructor(config: ConfigService) {
        const url = config.getOrThrow<string>('REDIS_URL');
        this.publisher = new Redis(url);
        this.subscriber = new Redis(url);
    }

    channelFor(shoutoutId: string): string {
        return `shoutout:${shoutoutId}:events`;
    }

    async publish(shoutoutId: string, event: ShoutoutStreamEvent): Promise<void> {
        await this.publisher.publish(this.channelFor(shoutoutId), JSON.stringify(event));
    }

    subscribe(shoutoutId: string, onMessage: (event: ShoutoutStreamEvent) => void): () => void {
        const channel = this.channelFor(shoutoutId);
        void this.subscriber.subscribe(channel);
        const handler = (ch: string, message: string) => {
            if (ch === channel) onMessage(JSON.parse(message) as ShoutoutStreamEvent);
        };
        this.subscriber.on('message', handler);
        return () => {
            this.subscriber.off('message', handler);
            void this.subscriber.unsubscribe(channel);
        };
    }

    onModuleDestroy(): void {
        this.publisher.disconnect();
        this.subscriber.disconnect();
    }
}
