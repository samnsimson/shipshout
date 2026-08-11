import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('github_connections')
export class GithubConnectionEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 255, unique: true })
    userId!: string;

    @Column({ type: 'bigint' })
    githubUserId!: string;

    @Column({ type: 'varchar', length: 255 })
    githubUsername!: string;

    @Column({ type: 'text' })
    accessToken!: string;

    @Column({ type: 'varchar', length: 512, nullable: true })
    scopes!: string | null;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt!: Date;
}
