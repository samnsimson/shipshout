import { Injectable } from '@nestjs/common';

export type ShoutoutStreamEvent = {
    status: string;
    channelKey?: string;
    error?: string;
};

@Injectable()
export class ShoutoutEventsService {
    async publish(_shoutoutId: string, _event: ShoutoutStreamEvent): Promise<void> {}
}
