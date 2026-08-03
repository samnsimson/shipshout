import { MigrationInterface, QueryRunner } from "typeorm";

export class Drafts1785734598224 implements MigrationInterface {
    name = 'Drafts1785734598224'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."drafts_channel_enum" AS ENUM('x', 'linkedin', 'email', 'buffer', 'mailchimp')`);
        await queryRunner.query(`CREATE TYPE "public"."drafts_status_enum" AS ENUM('pending_review', 'approved', 'published', 'failed')`);
        await queryRunner.query(`CREATE TABLE "drafts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "channel" "public"."drafts_channel_enum" NOT NULL, "generatedCopy" text NOT NULL, "editedCopy" text, "status" "public"."drafts_status_enum" NOT NULL DEFAULT 'pending_review', "aiMeta" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "releaseEventId" uuid, CONSTRAINT "PK_0598e229012c6cbd4ccbba97328" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "drafts" ADD CONSTRAINT "FK_5cd46a7291177714b15943d5273" FOREIGN KEY ("releaseEventId") REFERENCES "release_events"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "drafts" DROP CONSTRAINT "FK_5cd46a7291177714b15943d5273"`);
        await queryRunner.query(`DROP TABLE "drafts"`);
        await queryRunner.query(`DROP TYPE "public"."drafts_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."drafts_channel_enum"`);
    }

}
