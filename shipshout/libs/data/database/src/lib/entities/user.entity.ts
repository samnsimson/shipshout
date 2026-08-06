import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid') id!: string;
    @Column({ nullable: true, unique: true }) email?: string;
    @Column({ nullable: true }) emailVerifiedAt?: Date;
    @Column({ nullable: true }) name?: string;
    @Column({ nullable: true }) avatarUrl?: string;
    @CreateDateColumn() createdAt!: Date;
}
