import { MigrationInterface, QueryRunner } from 'typeorm';

const EMAIL_NEWSLETTER_CONFIG_SCHEMA = JSON.stringify({
    type: 'object',
    properties: {
        recipients: {
            type: 'array',
            items: { type: 'string', format: 'email' },
            minItems: 1,
        },
        subjectPrefix: { type: 'string' },
    },
    required: ['recipients'],
});

export class Migration1786522000000 implements MigrationInterface {
    name = 'Migration1786522000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "channel_types" ("key" character varying(64) NOT NULL, "display_name" character varying(128) NOT NULL, "description" text NOT NULL, "kind" character varying(32) NOT NULL, "config_schema" jsonb NOT NULL, "sort_order" integer NOT NULL, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_channel_types" PRIMARY KEY ("key"))`,
        );

        await queryRunner.query(
            `INSERT INTO "channel_types" ("key", "display_name", "description", "kind", "config_schema", "sort_order", "is_active") VALUES ('email_alert', 'Email alert', 'Send a notification to your account email when a shoutout is ready.', 'notify', '{}'::jsonb, 1, true)`,
        );
        await queryRunner.query(
            `INSERT INTO "channel_types" ("key", "display_name", "description", "kind", "config_schema", "sort_order", "is_active") VALUES ('email_newsletter', 'Email newsletter', 'Publish shoutouts to a mailing list when you click Publish.', 'publish', '${EMAIL_NEWSLETTER_CONFIG_SCHEMA}'::jsonb, 2, true)`,
        );
        await queryRunner.query(
            `INSERT INTO "channel_types" ("key", "display_name", "description", "kind", "config_schema", "sort_order", "is_active") VALUES ('x', 'X (Twitter)', 'Post shoutouts to X when you click Publish.', 'publish', '{}'::jsonb, 3, true)`,
        );
        await queryRunner.query(
            `INSERT INTO "channel_types" ("key", "display_name", "description", "kind", "config_schema", "sort_order", "is_active") VALUES ('linkedin', 'LinkedIn', 'Share shoutouts on LinkedIn when you click Publish.', 'publish', '{}'::jsonb, 4, true)`,
        );

        await queryRunner.query(
            `CREATE TABLE "repository_channels" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "linked_repository_id" uuid NOT NULL, "channel_key" character varying(64) NOT NULL, "enabled" boolean NOT NULL DEFAULT false, "tone" character varying(32) NOT NULL DEFAULT 'professional', "config" jsonb NOT NULL DEFAULT '{}', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_repository_channels" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE UNIQUE INDEX "uq_repository_channels_linked_repository_channel" ON "repository_channels" ("linked_repository_id", "channel_key")`,
        );
        await queryRunner.query(
            `ALTER TABLE "repository_channels" ADD CONSTRAINT "FK_repository_channels_linked_repository" FOREIGN KEY ("linked_repository_id") REFERENCES "linked_repositories"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "repository_channels" ADD CONSTRAINT "FK_repository_channels_channel_key" FOREIGN KEY ("channel_key") REFERENCES "channel_types"("key") ON DELETE NO ACTION ON UPDATE NO ACTION`,
        );

        await queryRunner.query(
            `CREATE TABLE "shoutout_channel_drafts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "shoutout_id" uuid NOT NULL, "channel_key" character varying(64) NOT NULL, "title" character varying(512) NOT NULL, "body" text NOT NULL, "edited_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_shoutout_channel_drafts" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE UNIQUE INDEX "uq_shoutout_channel_drafts_shoutout_channel" ON "shoutout_channel_drafts" ("shoutout_id", "channel_key")`,
        );
        await queryRunner.query(
            `ALTER TABLE "shoutout_channel_drafts" ADD CONSTRAINT "FK_shoutout_channel_drafts_shoutout" FOREIGN KEY ("shoutout_id") REFERENCES "shoutouts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "shoutout_channel_drafts" ADD CONSTRAINT "FK_shoutout_channel_drafts_channel_key" FOREIGN KEY ("channel_key") REFERENCES "channel_types"("key") ON DELETE NO ACTION ON UPDATE NO ACTION`,
        );

        await queryRunner.query(
            `CREATE TABLE "shoutout_dispatch_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "shoutout_id" uuid NOT NULL, "channel_key" character varying(64) NOT NULL, "status" character varying(32) NOT NULL, "error" text, "sent_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_shoutout_dispatch_logs" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `ALTER TABLE "shoutout_dispatch_logs" ADD CONSTRAINT "FK_shoutout_dispatch_logs_shoutout" FOREIGN KEY ("shoutout_id") REFERENCES "shoutouts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );

        await queryRunner.query(`UPDATE "shoutouts" SET "status" = 'generating' WHERE "status" = 'pending_ai'`);
        await queryRunner.query(`ALTER TABLE "shoutouts" ALTER COLUMN "status" SET DEFAULT 'generating'`);

        await queryRunner.query(
            `UPDATE "subscription_plans" SET "limits" = "limits" || '{"channels": []}'::jsonb WHERE "limits"->'channels' IS NULL`,
        );
        await queryRunner.query(
            `UPDATE "subscription_plans" SET "limits" = jsonb_set("limits", '{channels}', '["email_alert"]') WHERE "name" = 'starter'`,
        );
        await queryRunner.query(
            `UPDATE "subscription_plans" SET "limits" = jsonb_set("limits", '{channels}', '["email_alert","email_newsletter"]') WHERE "name" = 'pro'`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `UPDATE "subscription_plans" SET "limits" = "limits" - 'channels' WHERE "limits" ? 'channels'`,
        );
        await queryRunner.query(`ALTER TABLE "shoutouts" ALTER COLUMN "status" SET DEFAULT 'pending_ai'`);
        await queryRunner.query(`UPDATE "shoutouts" SET "status" = 'pending_ai' WHERE "status" = 'generating'`);

        await queryRunner.query(`ALTER TABLE "shoutout_dispatch_logs" DROP CONSTRAINT "FK_shoutout_dispatch_logs_shoutout"`);
        await queryRunner.query(`DROP TABLE "shoutout_dispatch_logs"`);

        await queryRunner.query(`ALTER TABLE "shoutout_channel_drafts" DROP CONSTRAINT "FK_shoutout_channel_drafts_channel_key"`);
        await queryRunner.query(`ALTER TABLE "shoutout_channel_drafts" DROP CONSTRAINT "FK_shoutout_channel_drafts_shoutout"`);
        await queryRunner.query(`DROP INDEX "public"."uq_shoutout_channel_drafts_shoutout_channel"`);
        await queryRunner.query(`DROP TABLE "shoutout_channel_drafts"`);

        await queryRunner.query(`ALTER TABLE "repository_channels" DROP CONSTRAINT "FK_repository_channels_channel_key"`);
        await queryRunner.query(`ALTER TABLE "repository_channels" DROP CONSTRAINT "FK_repository_channels_linked_repository"`);
        await queryRunner.query(`DROP INDEX "public"."uq_repository_channels_linked_repository_channel"`);
        await queryRunner.query(`DROP TABLE "repository_channels"`);

        await queryRunner.query(`DROP TABLE "channel_types"`);
    }
}
