import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1786460400000 implements MigrationInterface {
    name = 'Migration1786460400000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "repository_triggers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "linked_repository_id" uuid NOT NULL, "release" boolean NOT NULL DEFAULT false, "tag_push" boolean NOT NULL DEFAULT false, "branch_push" boolean NOT NULL DEFAULT false, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_repository_triggers" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_repository_triggers_linked_repository" ON "repository_triggers" ("linked_repository_id")`);
        await queryRunner.query(
            `ALTER TABLE "repository_triggers" ADD CONSTRAINT "FK_repository_triggers_linked_repository" FOREIGN KEY ("linked_repository_id") REFERENCES "linked_repositories"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );

        await queryRunner.query(
            `CREATE TABLE "repository_webhooks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "linked_repository_id" uuid NOT NULL, "delivery_token" character varying(64) NOT NULL, "secret_encrypted" text NOT NULL, "github_hook_id" bigint, "status" character varying(32) NOT NULL DEFAULT 'pending', "last_delivery_at" TIMESTAMP WITH TIME ZONE, "last_error" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_repository_webhooks" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_repository_webhooks_linked_repository" ON "repository_webhooks" ("linked_repository_id")`);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_repository_webhooks_delivery_token" ON "repository_webhooks" ("delivery_token")`);
        await queryRunner.query(
            `ALTER TABLE "repository_webhooks" ADD CONSTRAINT "FK_repository_webhooks_linked_repository" FOREIGN KEY ("linked_repository_id") REFERENCES "linked_repositories"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );

        await queryRunner.query(
            `CREATE TABLE "trigger_events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "linked_repository_id" uuid NOT NULL, "user_id" character varying(255) NOT NULL, "github_delivery_id" character varying(255) NOT NULL, "event_type" character varying(32) NOT NULL, "trigger_type" character varying(32) NOT NULL, "summary" character varying(512) NOT NULL, "payload" jsonb NOT NULL, "status" character varying(32) NOT NULL, "shoutout_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_trigger_events" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_trigger_events_github_delivery" ON "trigger_events" ("github_delivery_id")`);
        await queryRunner.query(
            `ALTER TABLE "trigger_events" ADD CONSTRAINT "FK_trigger_events_linked_repository" FOREIGN KEY ("linked_repository_id") REFERENCES "linked_repositories"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );

        await queryRunner.query(
            `CREATE TABLE "shoutouts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" character varying(255) NOT NULL, "linked_repository_id" uuid NOT NULL, "trigger_event_id" uuid NOT NULL, "title" character varying(512) NOT NULL, "status" character varying(32) NOT NULL DEFAULT 'pending_ai', "source_summary" jsonb NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_shoutouts" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_shoutouts_trigger_event" ON "shoutouts" ("trigger_event_id")`);
        await queryRunner.query(
            `ALTER TABLE "shoutouts" ADD CONSTRAINT "FK_shoutouts_linked_repository" FOREIGN KEY ("linked_repository_id") REFERENCES "linked_repositories"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "shoutouts" ADD CONSTRAINT "FK_shoutouts_trigger_event" FOREIGN KEY ("trigger_event_id") REFERENCES "trigger_events"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "shoutouts" DROP CONSTRAINT "FK_shoutouts_trigger_event"`);
        await queryRunner.query(`ALTER TABLE "shoutouts" DROP CONSTRAINT "FK_shoutouts_linked_repository"`);
        await queryRunner.query(`DROP INDEX "public"."uq_shoutouts_trigger_event"`);
        await queryRunner.query(`DROP TABLE "shoutouts"`);
        await queryRunner.query(`ALTER TABLE "trigger_events" DROP CONSTRAINT "FK_trigger_events_linked_repository"`);
        await queryRunner.query(`DROP INDEX "public"."uq_trigger_events_github_delivery"`);
        await queryRunner.query(`DROP TABLE "trigger_events"`);
        await queryRunner.query(`ALTER TABLE "repository_webhooks" DROP CONSTRAINT "FK_repository_webhooks_linked_repository"`);
        await queryRunner.query(`DROP INDEX "public"."uq_repository_webhooks_delivery_token"`);
        await queryRunner.query(`DROP INDEX "public"."uq_repository_webhooks_linked_repository"`);
        await queryRunner.query(`DROP TABLE "repository_webhooks"`);
        await queryRunner.query(`ALTER TABLE "repository_triggers" DROP CONSTRAINT "FK_repository_triggers_linked_repository"`);
        await queryRunner.query(`DROP INDEX "public"."uq_repository_triggers_linked_repository"`);
        await queryRunner.query(`DROP TABLE "repository_triggers"`);
    }
}
