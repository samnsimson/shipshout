import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Draft,
  DraftStatus,
  PublishRecord,
  PublishStatus,
  Channel,
} from '@shipshout/data-entities';
import { ConnectorRegistry } from './connector-registry.js';

export interface ConnectionsPort {
  getActive(workspaceId: string, channel: Channel): Promise<{ id: string } | null>;
  getActiveAccessToken(workspaceId: string, channel: Channel): Promise<string>;
}

export const CONNECTIONS_PORT = Symbol('CONNECTIONS_PORT');

@Injectable()
export class DispatchService {
  constructor(
    @InjectRepository(Draft) private drafts: Repository<Draft>,
    @InjectRepository(PublishRecord) private records: Repository<PublishRecord>,
    private registry: ConnectorRegistry,
    @Inject(CONNECTIONS_PORT) private connections: ConnectionsPort,
  ) {}

  async dispatch(draftId: string): Promise<void> {
    const draft = await this.drafts.findOne({ where: { id: draftId } });
    if (!draft) throw new Error('Draft not found');
    if (draft.status !== DraftStatus.Approved) throw new Error('Draft not approved');
    const workspaceId = draft.releaseEvent.repository.workspace.id;
    const connector = this.registry.get(draft.channel);
    const connection = await this.connections.getActive(workspaceId, draft.channel);
    const text = draft.editedCopy ?? draft.generatedCopy;
    try {
      const token = await this.connections.getActiveAccessToken(workspaceId, draft.channel);
      const out = await connector.publish({ text, accessToken: token });
      await this.records.save(
        this.records.create({
          draft,
          channelConnection: connection ?? undefined,
          status: PublishStatus.Success,
          externalUrl: out.externalUrl,
        }),
      );
      draft.status = DraftStatus.Published;
      await this.drafts.save(draft);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      await this.records.save(
        this.records.create({
          draft,
          channelConnection: connection ?? undefined,
          status: PublishStatus.Failed,
          error: message,
        }),
      );
      draft.status = DraftStatus.Failed;
      await this.drafts.save(draft);
      throw err;
    }
  }
}
