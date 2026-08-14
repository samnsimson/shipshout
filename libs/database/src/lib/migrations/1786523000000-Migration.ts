import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1786523000000 implements MigrationInterface {
    name = 'Migration1786523000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DELETE FROM "linked_repositories" lr
            WHERE lr."id" IN (
                SELECT "id" FROM (
                    SELECT "id", ROW_NUMBER() OVER (PARTITION BY "github_repo_id" ORDER BY "linked_at" ASC) AS rn
                    FROM "linked_repositories"
                ) ranked
                WHERE rn > 1
            )
        `);
        await queryRunner.query(
            `CREATE UNIQUE INDEX "uq_linked_repositories_github_repo" ON "linked_repositories" ("github_repo_id")`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."uq_linked_repositories_github_repo"`);
    }
}
