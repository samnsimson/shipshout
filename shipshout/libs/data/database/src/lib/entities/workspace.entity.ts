import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('workspaces')
export class Workspace {
    @PrimaryGeneratedColumn('uuid') id!: string;
    @Column() name!: string;
    @Column({ unique: true }) slug!: string;
    @Column({ nullable: true }) stripeCustomerId?: string;
    @Column({ default: 'starter' }) plan!: string;
    @CreateDateColumn() createdAt!: Date;
}
