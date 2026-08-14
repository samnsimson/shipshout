import { MigrationInterface, QueryRunner } from 'typeorm';

export class RepositoryGithubInstallation1785735500000 implements MigrationInterface {
    name = 'RepositoryGithubInstallation1785735500000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TYPE "public"."repositories_webhookstatus_enum" ADD VALUE IF NOT EXISTS 'disconnected'`,
        );
        await queryRunner.query(`ALTER TABLE "repositories" ADD "githubInstallationId" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "repositories" DROP COLUMN "githubInstallationId"`);
    }
}
