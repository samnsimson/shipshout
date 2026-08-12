import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ShoutoutEntity } from './shoutout.entity';

export type ShoutoutDispatchStatus = 'sent' | 'failed' | 'skipped';

@Entity('shoutout_dispatch_logs')
export class ShoutoutDispatchLogEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid' })
    shoutoutId!: string;

    @ManyToOne(() => ShoutoutEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'shoutout_id' })
    shoutout!: ShoutoutEntity;

    @Column({ type: 'varchar', length: 64 })
    channelKey!: string;

    @Column({ type: 'varchar', length: 32 })
    status!: ShoutoutDispatchStatus;

    @Column({ type: 'text', nullable: true })
    error!: string | null;

    @Column({ type: 'timestamptz', nullable: true })
    sentAt!: Date | null;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt!: Date;
}
