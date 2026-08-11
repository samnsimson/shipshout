import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('linked_repositories')
@Index('uq_linked_repositories_user_github_repo', ['userId', 'githubRepoId'], { unique: true })
export class LinkedRepositoryEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 255 })
    userId!: string;

    @Column({ type: 'bigint' })
    githubRepoId!: string;

    @Column({ type: 'varchar', length: 512 })
    fullName!: string;

    @Column({ type: 'varchar', length: 255 })
    name!: string;

    @Column({ type: 'varchar', length: 255 })
    owner!: string;

    @Column({ type: 'varchar', length: 255, default: 'main' })
    defaultBranch!: string;

    @Column({ type: 'boolean', default: false })
    private!: boolean;

    @Column({ type: 'varchar', length: 512 })
    htmlUrl!: string;

    @CreateDateColumn({ type: 'timestamptz' })
    linkedAt!: Date;
}
