import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid') id!: string;
    @Column({ unique: true }) githubId!: string;
    @Column({ nullable: true }) email?: string;
    @Column({ nullable: true }) name?: string;
    @Column({ nullable: true }) avatarUrl?: string;
    @CreateDateColumn() createdAt!: Date;
}
