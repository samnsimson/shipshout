import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { Repository as Repo } from './repository.entity.js';
import { SourceProvider } from './source-provider.enum.js';

export { SourceProvider };

export enum ReleaseEventStatus {
  Received = 'received',
  Generating = 'generating',
  Drafted = 'drafted',
  Failed = 'failed',
}

@Entity('release_events')
@Unique(['repository', 'deliveryId'])
export class ReleaseEvent {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @ManyToOne(() => Repo, { eager: true }) repository!: Repo;
  @Column({ type: 'enum', enum: SourceProvider }) source!: SourceProvider;
  @Column() deliveryId!: string;
  @Column({ type: 'jsonb' }) rawPayload!: unknown;
  @Column({ type: 'text', nullable: true }) commitSummary?: string;
  @Column({ type: 'enum', enum: ReleaseEventStatus, default: ReleaseEventStatus.Received })
  status!: ReleaseEventStatus;
  @CreateDateColumn() createdAt!: Date;
}
