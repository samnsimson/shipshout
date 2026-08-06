import { MigrationInterface, QueryRunner } from 'typeorm';

export class RepositoryWebhookStatus1785735300000 implements MigrationInterface {
    name = 'RepositoryWebhookStatus1785735300000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."repositories_webhookstatus_enum" AS ENUM('pending', 'active', 'failed')`);
        await queryRunner.query(
            `ALTER TABLE "repositories" ADD "webhookStatus" "public"."repositories_webhookstatus_enum" NOT NULL DEFAULT 'pending'`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "repositories" DROP COLUMN "webhookStatus"`);
        await queryRunner.query(`DROP TYPE "public"."repositories_webhookstatus_enum"`);
    }
}
