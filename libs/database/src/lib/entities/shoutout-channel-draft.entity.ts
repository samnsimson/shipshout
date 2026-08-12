import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ChannelTypeEntity } from './channel-type.entity';
import { ShoutoutEntity } from './shoutout.entity';

@Entity('shoutout_channel_drafts')
@Index('uq_shoutout_channel_drafts_shoutout_channel', ['shoutoutId', 'channelKey'], { unique: true })
export class ShoutoutChannelDraftEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid' })
    shoutoutId!: string;

    @ManyToOne(() => ShoutoutEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'shoutout_id' })
    shoutout!: ShoutoutEntity;

    @Column({ type: 'varchar', length: 64 })
    channelKey!: string;

    @ManyToOne(() => ChannelTypeEntity)
    @JoinColumn({ name: 'channel_key' })
    channelType!: ChannelTypeEntity;

    @Column({ type: 'varchar', length: 512 })
    title!: string;

    @Column({ type: 'text' })
    body!: string;

    @Column({ type: 'timestamptz', nullable: true })
    editedAt!: Date | null;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt!: Date;
}
