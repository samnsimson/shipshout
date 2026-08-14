import { MigrationInterface, QueryRunner } from 'typeorm';

export class Ingestion1785734410746 implements MigrationInterface {
    name = 'Ingestion1785734410746';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."repositories_provider_enum" AS ENUM('github', 'linear', 'jira')`);
        await queryRunner.query(
            `CREATE TABLE "repositories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "provider" "public"."repositories_provider_enum" NOT NULL, "externalId" character varying NOT NULL, "name" character varying NOT NULL, "webhookSecret" text NOT NULL, "enabled" boolean NOT NULL DEFAULT true, "workspaceId" uuid, CONSTRAINT "PK_ef0c358c04b4f4d29b8ca68ddff" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(`CREATE TYPE "public"."brand_profiles_tone_enum" AS ENUM('dev_focused', 'professional', 'hype_startup')`);
        await queryRunner.query(
            `CREATE TABLE "brand_profiles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tone" "public"."brand_profiles_tone_enum" NOT NULL DEFAULT 'professional', "customInstructions" text, "emojiPolicy" boolean NOT NULL DEFAULT true, "workspaceId" uuid, CONSTRAINT "PK_215e0a9fad7cbd920d63caea7c6" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(`CREATE TYPE "public"."release_events_source_enum" AS ENUM('github', 'linear', 'jira')`);
        await queryRunner.query(`CREATE TYPE "public"."release_events_status_enum" AS ENUM('received', 'generating', 'drafted', 'failed')`);
        await queryRunner.query(
            `CREATE TABLE "release_events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "source" "public"."release_events_source_enum" NOT NULL, "deliveryId" character varying NOT NULL, "rawPayload" jsonb NOT NULL, "commitSummary" text, "status" "public"."release_events_status_enum" NOT NULL DEFAULT 'received', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "repositoryId" uuid, CONSTRAINT "UQ_219b9fc2d72da7bb24d74f061a6" UNIQUE ("repositoryId", "deliveryId"), CONSTRAINT "PK_eca8575509042426a9bb5801feb" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `ALTER TABLE "repositories" ADD CONSTRAINT "FK_d206ec74e9609a06c7d2381d67b" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "brand_profiles" ADD CONSTRAINT "FK_ecd081c24d2057785fb0e3bf2d9" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "release_events" ADD CONSTRAINT "FK_dbed9a32be2522313bbbe7f3bb3" FOREIGN KEY ("repositoryId") REFERENCES "repositories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "release_events" DROP CONSTRAINT "FK_dbed9a32be2522313bbbe7f3bb3"`);
        await queryRunner.query(`ALTER TABLE "brand_profiles" DROP CONSTRAINT "FK_ecd081c24d2057785fb0e3bf2d9"`);
        await queryRunner.query(`ALTER TABLE "repositories" DROP CONSTRAINT "FK_d206ec74e9609a06c7d2381d67b"`);
        await queryRunner.query(`DROP TABLE "release_events"`);
        await queryRunner.query(`DROP TYPE "public"."release_events_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."release_events_source_enum"`);
        await queryRunner.query(`DROP TABLE "brand_profiles"`);
        await queryRunner.query(`DROP TYPE "public"."brand_profiles_tone_enum"`);
        await queryRunner.query(`DROP TABLE "repositories"`);
        await queryRunner.query(`DROP TYPE "public"."repositories_provider_enum"`);
    }
}
