import { Column, Entity, Index, JoinColumn, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { LinkedRepositoryEntity } from './linked-repository.entity';

@Entity('repository_triggers')
@Index('uq_repository_triggers_linked_repository', ['linkedRepositoryId'], { unique: true })
export class RepositoryTriggerEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid' })
    linkedRepositoryId!: string;

    @OneToOne(() => LinkedRepositoryEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'linked_repository_id' })
    linkedRepository!: LinkedRepositoryEntity;

    @Column({ type: 'boolean', default: false })
    release!: boolean;

    @Column({ type: 'boolean', default: false })
    tagPush!: boolean;

    @Column({ type: 'boolean', default: false })
    branchPush!: boolean;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt!: Date;
}
