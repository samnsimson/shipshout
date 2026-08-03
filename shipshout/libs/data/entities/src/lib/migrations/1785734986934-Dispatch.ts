import { MigrationInterface, QueryRunner } from "typeorm";

export class Dispatch1785734986934 implements MigrationInterface {
    name = 'Dispatch1785734986934'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."channel_connections_type_enum" AS ENUM('x', 'linkedin', 'email', 'buffer', 'mailchimp')`);
        await queryRunner.query(`CREATE TYPE "public"."channel_connections_status_enum" AS ENUM('active', 'revoked')`);
        await queryRunner.query(`CREATE TABLE "channel_connections" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" "public"."channel_connections_type_enum" NOT NULL, "accessToken" text NOT NULL, "refreshToken" text, "externalAccountId" character varying, "status" "public"."channel_connections_status_enum" NOT NULL DEFAULT 'active', "workspaceId" uuid, CONSTRAINT "PK_2ae1fe901084592fd4d6795faea" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."publish_records_status_enum" AS ENUM('success', 'failed')`);
        await queryRunner.query(`CREATE TABLE "publish_records" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "externalUrl" character varying, "status" "public"."publish_records_status_enum" NOT NULL, "error" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "draftId" uuid, "channelConnectionId" uuid, CONSTRAINT "PK_fb4622d2f62653f6b7209e098ed" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "channel_connections" ADD CONSTRAINT "FK_78b5256fb30608b75719070332a" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "publish_records" ADD CONSTRAINT "FK_02e877bb8dfe4f497896c125a3f" FOREIGN KEY ("draftId") REFERENCES "drafts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "publish_records" ADD CONSTRAINT "FK_25e2ff3d2e41592cb4c68c6dbbb" FOREIGN KEY ("channelConnectionId") REFERENCES "channel_connections"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "publish_records" DROP CONSTRAINT "FK_25e2ff3d2e41592cb4c68c6dbbb"`);
        await queryRunner.query(`ALTER TABLE "publish_records" DROP CONSTRAINT "FK_02e877bb8dfe4f497896c125a3f"`);
        await queryRunner.query(`ALTER TABLE "channel_connections" DROP CONSTRAINT "FK_78b5256fb30608b75719070332a"`);
        await queryRunner.query(`DROP TABLE "publish_records"`);
        await queryRunner.query(`DROP TYPE "public"."publish_records_status_enum"`);
        await queryRunner.query(`DROP TABLE "channel_connections"`);
        await queryRunner.query(`DROP TYPE "public"."channel_connections_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."channel_connections_type_enum"`);
    }

}
