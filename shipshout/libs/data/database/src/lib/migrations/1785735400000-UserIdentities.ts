import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserIdentities1785735400000 implements MigrationInterface {
    name = 'UserIdentities1785735400000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TYPE "public"."user_identities_provider_enum" AS ENUM('github', 'google', 'credentials')`,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."auth_tokens_type_enum" AS ENUM('email_verify', 'password_reset')`,
        );
        await queryRunner.query(
            `CREATE TABLE "user_identities" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "provider" "public"."user_identities_provider_enum" NOT NULL, "providerUserId" character varying NOT NULL, "passwordHash" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_user_identities_provider_user" UNIQUE ("provider", "providerUserId"), CONSTRAINT "UQ_user_identities_user_provider" UNIQUE ("userId", "provider"), CONSTRAINT "PK_user_identities" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE TABLE "auth_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "type" "public"."auth_tokens_type_enum" NOT NULL, "tokenHash" character varying NOT NULL, "expiresAt" TIMESTAMP NOT NULL, "usedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_auth_tokens" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `ALTER TABLE "user_identities" ADD CONSTRAINT "FK_user_identities_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "auth_tokens" ADD CONSTRAINT "FK_auth_tokens_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `INSERT INTO "user_identities" ("userId", "provider", "providerUserId", "createdAt") SELECT id, 'github', "githubId", "createdAt" FROM "users"`,
        );
        await queryRunner.query(`ALTER TABLE "users" ADD "emailVerifiedAt" TIMESTAMP`);
        await queryRunner.query(`UPDATE "users" SET "emailVerifiedAt" = "createdAt"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "UQ_42148de213279d66bf94b363bf2"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "githubId"`);
        await queryRunner.query(
            `ALTER TABLE "users" ADD CONSTRAINT "UQ_users_email" UNIQUE ("email")`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "UQ_users_email"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "githubId" character varying`);
        await queryRunner.query(
            `UPDATE "users" u SET "githubId" = i."providerUserId" FROM "user_identities" i WHERE i."userId" = u.id AND i.provider = 'github'`,
        );
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "githubId" SET NOT NULL`);
        await queryRunner.query(
            `ALTER TABLE "users" ADD CONSTRAINT "UQ_42148de213279d66bf94b363bf2" UNIQUE ("githubId")`,
        );
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "emailVerifiedAt"`);
        await queryRunner.query(`ALTER TABLE "auth_tokens" DROP CONSTRAINT "FK_auth_tokens_user"`);
        await queryRunner.query(`ALTER TABLE "user_identities" DROP CONSTRAINT "FK_user_identities_user"`);
        await queryRunner.query(`DROP TABLE "auth_tokens"`);
        await queryRunner.query(`DROP TABLE "user_identities"`);
        await queryRunner.query(`DROP TYPE "public"."auth_tokens_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."user_identities_provider_enum"`);
    }
}
