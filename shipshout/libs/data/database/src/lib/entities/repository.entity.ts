import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Workspace } from './workspace.entity.js';
import { SourceProvider } from './source-provider.enum.js';

export enum WebhookStatus {
    Pending = 'pending',
    Active = 'active',
    Failed = 'failed',
}

@Entity('repositories')
export class Repository {
    @PrimaryGeneratedColumn('uuid') id!: string;
    @ManyToOne(() => Workspace, { eager: true }) workspace!: Workspace;
    @Column({ type: 'enum', enum: SourceProvider }) provider!: SourceProvider;
    @Column() externalId!: string;
    @Column() name!: string;
    @Column({ type: 'text' }) webhookSecret!: string;
    @Column({ default: true }) enabled!: boolean;
    @Column({ type: 'enum', enum: WebhookStatus, default: WebhookStatus.Pending })
    webhookStatus!: WebhookStatus;
}
