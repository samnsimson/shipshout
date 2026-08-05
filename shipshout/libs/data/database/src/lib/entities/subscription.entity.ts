import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Workspace } from './workspace.entity';

export enum Tier {
    Starter = 'starter',
    Pro = 'pro',
    Growth = 'growth',
}

export enum SubscriptionStatus {
    Active = 'active',
    PastDue = 'past_due',
    Canceled = 'canceled',
}

@Entity('subscriptions')
export class Subscription {
    @PrimaryGeneratedColumn('uuid') id!: string;
    @ManyToOne(() => Workspace, { eager: true }) workspace!: Workspace;
    @Column({ nullable: true }) stripeSubId?: string;
    @Column({ type: 'enum', enum: Tier, default: Tier.Starter }) tier!: Tier;
    @Column({ type: 'enum', enum: SubscriptionStatus, default: SubscriptionStatus.Active }) status!: SubscriptionStatus;
    @Column({ type: 'timestamptz', nullable: true }) currentPeriodEnd?: Date;
}
