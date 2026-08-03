import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiEngine } from './ai-engine.js';
import { buildPrompt, CHANNEL_CONSTRAINTS } from '@shipshout/core-domain';
import {
  ReleaseEvent,
  ReleaseEventStatus,
  BrandProfile,
  Draft,
  DraftStatus,
  Channel,
  Tone,
} from '@shipshout/data-entities';

@Injectable()
export class GenerationService {
  constructor(
    private engine: AiEngine,
    @InjectRepository(ReleaseEvent) private events: Repository<ReleaseEvent>,
    @InjectRepository(BrandProfile) private brands: Repository<BrandProfile>,
    @InjectRepository(Draft) private drafts: Repository<Draft>,
  ) {}

  async generateForEvent(releaseEventId: string, channels: Channel[]): Promise<Draft[]> {
    const event = await this.events.findOne({ where: { id: releaseEventId } });
    if (!event) throw new Error(`ReleaseEvent ${releaseEventId} not found`);
    const workspaceId = event.repository.workspace.id;
    const brand =
      (await this.brands.findOne({ where: { workspace: { id: workspaceId } } })) ??
      ({ tone: Tone.Professional, emojiPolicy: true } as BrandProfile);

    const results: Draft[] = [];
    for (const channel of channels) {
      const prompt = buildPrompt({
        commitSummary: event.commitSummary ?? '',
        tone: brand.tone,
        customInstructions: brand.customInstructions,
        emojiPolicy: brand.emojiPolicy,
        channel,
      });
      const r = await this.engine.generate(prompt, { maxTokens: 400 });
      const max = CHANNEL_CONSTRAINTS[channel].maxChars;
      const text = max ? r.text.slice(0, max) : r.text;
      const draft = await this.drafts.save(
        this.drafts.create({
          releaseEvent: event,
          channel,
          generatedCopy: text,
          status: DraftStatus.PendingReview,
          aiMeta: {
            provider: r.provider,
            model: r.model,
            tokens: r.tokens,
            latencyMs: r.latencyMs,
          },
        }),
      );
      results.push(draft);
    }
    event.status = ReleaseEventStatus.Drafted;
    await this.events.save(event);
    return results;
  }
}
