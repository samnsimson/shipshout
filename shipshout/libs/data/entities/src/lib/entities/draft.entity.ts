import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { ReleaseEvent } from './release-event.entity.js';

export enum Channel {
  X = 'x',
  LinkedIn = 'linkedin',
  Email = 'email',
  Buffer = 'buffer',
  Mailchimp = 'mailchimp',
}

export enum DraftStatus {
  PendingReview = 'pending_review',
  Approved = 'approved',
  Published = 'published',
  Failed = 'failed',
}

@Entity('drafts')
export class Draft {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @ManyToOne(() => ReleaseEvent, { eager: true }) releaseEvent!: ReleaseEvent;
  @Column({ type: 'enum', enum: Channel }) channel!: Channel;
  @Column({ type: 'text' }) generatedCopy!: string;
  @Column({ type: 'text', nullable: true }) editedCopy?: string;
  @Column({ type: 'enum', enum: DraftStatus, default: DraftStatus.PendingReview })
  status!: DraftStatus;
  @Column({ type: 'jsonb', nullable: true })
  aiMeta?: { provider: string; model: string; tokens?: number; latencyMs?: number };
  @CreateDateColumn() createdAt!: Date;
}
