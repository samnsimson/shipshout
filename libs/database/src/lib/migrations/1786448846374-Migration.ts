import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1786448846374 implements MigrationInterface {
    name = 'Migration1786448846374'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "linked_repositories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" character varying(255) NOT NULL, "github_repo_id" bigint NOT NULL, "full_name" character varying(512) NOT NULL, "name" character varying(255) NOT NULL, "owner" character varying(255) NOT NULL, "default_branch" character varying(255) NOT NULL DEFAULT 'main', "private" boolean NOT NULL DEFAULT false, "html_url" character varying(512) NOT NULL, "linked_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_620af22a9f0832968c100898c74" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_linked_repositories_user_github_repo" ON "linked_repositories"  ("user_id", "github_repo_id") `);
        await queryRunner.query(`CREATE TABLE "github_connections" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" character varying(255) NOT NULL, "github_user_id" bigint NOT NULL, "github_username" character varying(255) NOT NULL, "access_token" text NOT NULL, "scopes" character varying(512), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_a3dd94f85b7c8809b6982259500" UNIQUE ("user_id"), CONSTRAINT "PK_d51a137f9d3777b674dca888d9b" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "github_connections"`);
        await queryRunner.query(`DROP INDEX "public"."uq_linked_repositories_user_github_repo"`);
        await queryRunner.query(`DROP TABLE "linked_repositories"`);
    }

}
