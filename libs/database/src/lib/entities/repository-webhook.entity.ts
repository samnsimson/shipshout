import { Column, CreateDateColumn, Entity, Index, JoinColumn, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { LinkedRepositoryEntity } from './linked-repository.entity';

export type RepositoryWebhookStatus = 'pending' | 'active' | 'manual_required' | 'error';

@Entity('repository_webhooks')
@Index('uq_repository_webhooks_linked_repository', ['linkedRepositoryId'], { unique: true })
@Index('uq_repository_webhooks_delivery_token', ['deliveryToken'], { unique: true })
export class RepositoryWebhookEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid' })
    linkedRepositoryId!: string;

    @OneToOne(() => LinkedRepositoryEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'linked_repository_id' })
    linkedRepository!: LinkedRepositoryEntity;

    @Column({ type: 'varchar', length: 64 })
    deliveryToken!: string;

    @Column({ type: 'text' })
    secretEncrypted!: string;

    @Column({ type: 'bigint', nullable: true })
    githubHookId!: string | null;

    @Column({ type: 'varchar', length: 32, default: 'pending' })
    status!: RepositoryWebhookStatus;

    @Column({ type: 'timestamptz', nullable: true })
    lastDeliveryAt!: Date | null;

    @Column({ type: 'text', nullable: true })
    lastError!: string | null;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt!: Date;
}
