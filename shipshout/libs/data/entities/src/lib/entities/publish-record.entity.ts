import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Draft } from './draft.entity.js';
import { ChannelConnection } from './channel-connection.entity.js';

export enum PublishStatus {
  Success = 'success',
  Failed = 'failed',
}

@Entity('publish_records')
export class PublishRecord {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @ManyToOne(() => Draft, { eager: true }) draft!: Draft;
  @ManyToOne(() => ChannelConnection, { eager: true, nullable: true })
  channelConnection?: ChannelConnection;
  @Column({ nullable: true }) externalUrl?: string;
  @Column({ type: 'enum', enum: PublishStatus }) status!: PublishStatus;
  @Column({ type: 'text', nullable: true }) error?: string;
  @CreateDateColumn() createdAt!: Date;
}
