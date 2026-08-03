import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { Repository as OrmRepo } from 'typeorm';
import { Draft, DraftStatus } from '@shipshout/data-entities';
import { UpdateDraftDto } from '@shipshout/contracts';
import { QUEUES, DispatchJob } from '@shipshout/queue';

@Injectable()
export class DraftsService {
  constructor(
    private drafts: OrmRepo<Draft>,
    @InjectQueue(QUEUES.dispatch) private dispatchQueue: Queue,
  ) {}

  listForWorkspace(workspaceId: string) {
    return this.drafts.find({
      where: { releaseEvent: { repository: { workspace: { id: workspaceId } } } },
      order: { createdAt: 'DESC' },
    });
  }

  private async load(workspaceId: string, draftId: string): Promise<Draft> {
    const d = await this.drafts.findOne({
      where: { id: draftId, releaseEvent: { repository: { workspace: { id: workspaceId } } } },
    });
    if (!d) throw new Error('Draft not found');
    return d;
  }

  async updateCopy(workspaceId: string, draftId: string, dto: UpdateDraftDto) {
    const d = await this.load(workspaceId, draftId);
    d.editedCopy = dto.editedCopy;
    return this.drafts.save(d);
  }

  async approve(workspaceId: string, draftId: string) {
    const d = await this.load(workspaceId, draftId);
    d.status = DraftStatus.Approved;
    return this.drafts.save(d);
  }

  async publish(workspaceId: string, draftId: string) {
    const d = await this.load(workspaceId, draftId);
    if (d.status !== DraftStatus.Approved) throw new Error('Draft must be approved before publishing');
    const job: DispatchJob = { draftId: d.id };
    await this.dispatchQueue.add('dispatch', job);
    return { enqueued: true };
  }
}
