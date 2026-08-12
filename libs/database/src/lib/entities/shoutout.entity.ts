import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { LinkedRepositoryEntity } from './linked-repository.entity';
import { TriggerEventEntity } from './trigger-event.entity';

export type ShoutoutStatus = 'pending_ai';

@Entity('shoutouts')
@Index('uq_shoutouts_trigger_event', ['triggerEventId'], { unique: true })
export class ShoutoutEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 255 })
    userId!: string;

    @Column({ type: 'uuid' })
    linkedRepositoryId!: string;

    @ManyToOne(() => LinkedRepositoryEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'linked_repository_id' })
    linkedRepository!: LinkedRepositoryEntity;

    @Column({ type: 'uuid' })
    triggerEventId!: string;

    @OneToOne(() => TriggerEventEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'trigger_event_id' })
    triggerEvent!: TriggerEventEntity;

    @Column({ type: 'varchar', length: 512 })
    title!: string;

    @Column({ type: 'varchar', length: 32, default: 'pending_ai' })
    status!: ShoutoutStatus;

    @Column({ type: 'jsonb' })
    sourceSummary!: Record<string, unknown>;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt!: Date;
}
