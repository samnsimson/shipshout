import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { BaseRepository, ShoutoutChannelDraftEntity } from '@shipshout/database';
import { DataSource } from 'typeorm';

@Injectable()
export class ShoutoutChannelDraftRepository extends BaseRepository<ShoutoutChannelDraftEntity> {
    constructor(@InjectDataSource() dataSource: DataSource) {
        super(ShoutoutChannelDraftEntity, dataSource);
    }

    findByShoutoutId(shoutoutId: string): Promise<ShoutoutChannelDraftEntity[]> {
        return this.find({ where: { shoutoutId }, order: { channelKey: 'ASC' } });
    }

    async upsertDraft(params: { shoutoutId: string; channelKey: string; title: string; body: string }): Promise<void> {
        const existing = await this.findOne({ where: { shoutoutId: params.shoutoutId, channelKey: params.channelKey } });
        if (existing) await this.save({ ...existing, title: params.title, body: params.body, editedAt: null });
        else await this.save({ ...params, editedAt: null });
    }

    async updateDraft(params: { shoutoutId: string; channelKey: string; title?: string; body?: string }): Promise<ShoutoutChannelDraftEntity | null> {
        const existing = await this.findOne({ where: { shoutoutId: params.shoutoutId, channelKey: params.channelKey } });
        if (!existing) return null;
        if (params.title !== undefined) existing.title = params.title;
        if (params.body !== undefined) existing.body = params.body;
        existing.editedAt = new Date();
        return this.save(existing);
    }
}
