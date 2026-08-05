import { MigrationInterface, QueryRunner } from 'typeorm';

export class Billing1785735200000 implements MigrationInterface {
    name = 'Billing1785735200000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."subscriptions_tier_enum" AS ENUM('starter', 'pro', 'growth')`);
        await queryRunner.query(`CREATE TYPE "public"."subscriptions_status_enum" AS ENUM('active', 'past_due', 'canceled')`);
        await queryRunner.query(
            `CREATE TABLE "subscriptions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "stripeSubId" character varying, "tier" "public"."subscriptions_tier_enum" NOT NULL DEFAULT 'starter', "status" "public"."subscriptions_status_enum" NOT NULL DEFAULT 'active', "currentPeriodEnd" TIMESTAMP WITH TIME ZONE, "workspaceId" uuid, CONSTRAINT "PK_a87248e9c4c5d5b0c9c8c3d5e5a" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE TABLE "usage_counters" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "period" character varying NOT NULL, "releasesProcessed" integer NOT NULL DEFAULT '0', "workspaceId" uuid, CONSTRAINT "UQ_usage_counters_workspace_period" UNIQUE ("workspaceId", "period"), CONSTRAINT "PK_usage_counters" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `ALTER TABLE "subscriptions" ADD CONSTRAINT "FK_subscriptions_workspace" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "usage_counters" ADD CONSTRAINT "FK_usage_counters_workspace" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "usage_counters" DROP CONSTRAINT "FK_usage_counters_workspace"`);
        await queryRunner.query(`ALTER TABLE "subscriptions" DROP CONSTRAINT "FK_subscriptions_workspace"`);
        await queryRunner.query(`DROP TABLE "usage_counters"`);
        await queryRunner.query(`DROP TABLE "subscriptions"`);
        await queryRunner.query(`DROP TYPE "public"."subscriptions_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."subscriptions_tier_enum"`);
    }
}
