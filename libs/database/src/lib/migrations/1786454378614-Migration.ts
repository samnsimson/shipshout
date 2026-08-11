import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1786454378614 implements MigrationInterface {
    name = 'Migration1786454378614'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "subscription_plans" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(64) NOT NULL, "display_name" character varying(128) NOT NULL, "stripe_price_id" character varying(255), "stripe_annual_price_id" character varying(255), "trial_days" integer, "limits" jsonb NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "sort_order" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_ae18a0f6e0143f06474aa8cef1f" UNIQUE ("name"), CONSTRAINT "PK_9ab8fe6918451ab3d0a4fb6bb0c" PRIMARY KEY ("id"))`);
        await queryRunner.query(
            `INSERT INTO "subscription_plans" ("name", "display_name", "stripe_price_id", "stripe_annual_price_id", "trial_days", "limits", "is_active", "sort_order") VALUES ('free', 'Free', NULL, NULL, NULL, '{"repos":0,"releasesPerMonth":0}'::jsonb, true, 0)`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "subscription_plans"`);
    }

}
