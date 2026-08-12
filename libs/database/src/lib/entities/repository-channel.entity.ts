import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { ChannelTypeEntity } from './channel-type.entity';
import { LinkedRepositoryEntity } from './linked-repository.entity';

export type RepositoryChannelTone = 'professional' | 'dev_focused' | 'hype';

@Entity('repository_channels')
@Index('uq_repository_channels_linked_repository_channel', ['linkedRepositoryId', 'channelKey'], { unique: true })
export class RepositoryChannelEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid' })
    linkedRepositoryId!: string;

    @ManyToOne(() => LinkedRepositoryEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'linked_repository_id' })
    linkedRepository!: LinkedRepositoryEntity;

    @Column({ type: 'varchar', length: 64 })
    channelKey!: string;

    @ManyToOne(() => ChannelTypeEntity)
    @JoinColumn({ name: 'channel_key' })
    channelType!: ChannelTypeEntity;

    @Column({ type: 'boolean', default: false })
    enabled!: boolean;

    @Column({ type: 'varchar', length: 32, default: 'professional' })
    tone!: RepositoryChannelTone;

    @Column({ type: 'jsonb', default: {} })
    config!: Record<string, unknown>;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt!: Date;
}
