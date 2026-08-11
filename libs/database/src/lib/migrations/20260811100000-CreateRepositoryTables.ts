import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRepositoryTables20260811100000 implements MigrationInterface {
    name = 'CreateRepositoryTables20260811100000';

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "github_connections" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "user_id" character varying(255) NOT NULL,
                "github_user_id" bigint NOT NULL,
                "github_username" character varying(255) NOT NULL,
                "access_token" text NOT NULL,
                "scopes" character varying(512),
                "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
                CONSTRAINT "PK_github_connections" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_github_connections_user_id" UNIQUE ("user_id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "linked_repositories" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "user_id" character varying(255) NOT NULL,
                "github_repo_id" bigint NOT NULL,
                "full_name" character varying(512) NOT NULL,
                "name" character varying(255) NOT NULL,
                "owner" character varying(255) NOT NULL,
                "default_branch" character varying(255) NOT NULL DEFAULT 'main',
                "private" boolean NOT NULL DEFAULT false,
                "html_url" character varying(512) NOT NULL,
                "linked_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
                CONSTRAINT "PK_linked_repositories" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_linked_repositories_user_github_repo" UNIQUE ("user_id", "github_repo_id")
            )
        `);
        await queryRunner.query(`CREATE INDEX "IDX_linked_repositories_user_id" ON "linked_repositories" ("user_id")`);
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_linked_repositories_user_id"`);
        await queryRunner.query(`DROP TABLE "linked_repositories"`);
        await queryRunner.query(`DROP TABLE "github_connections"`);
    }
}
