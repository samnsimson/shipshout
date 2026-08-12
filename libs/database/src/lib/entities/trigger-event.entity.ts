import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { LinkedRepositoryEntity } from './linked-repository.entity';

export type TriggerEventType = 'release' | 'tag_push' | 'branch_push';
export type TriggerEventStatus = 'processed' | 'ignored' | 'limit_exceeded';

@Entity('trigger_events')
@Index('uq_trigger_events_github_delivery', ['githubDeliveryId'], { unique: true })
export class TriggerEventEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid' })
    linkedRepositoryId!: string;

    @ManyToOne(() => LinkedRepositoryEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'linked_repository_id' })
    linkedRepository!: LinkedRepositoryEntity;

    @Column({ type: 'varchar', length: 255 })
    userId!: string;

    @Column({ type: 'varchar', length: 255 })
    githubDeliveryId!: string;

    @Column({ type: 'varchar', length: 32 })
    eventType!: string;

    @Column({ type: 'varchar', length: 32 })
    triggerType!: TriggerEventType;

    @Column({ type: 'varchar', length: 512 })
    summary!: string;

    @Column({ type: 'jsonb' })
    payload!: Record<string, unknown>;

    @Column({ type: 'varchar', length: 32 })
    status!: TriggerEventStatus;

    @Column({ type: 'uuid', nullable: true })
    shoutoutId!: string | null;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt!: Date;
}
