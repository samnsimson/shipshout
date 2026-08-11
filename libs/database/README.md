# database

Nest dynamic module wrapping TypeORM (Postgres).

## Building

Run `nx build database` to build the library.

## Running unit tests

Run `nx test database` to execute the unit tests via [Jest](https://jestjs.io).

## Entities

Add `*.entity.ts` under `src/lib/entities/` and export it from `ENTITIES` in `src/lib/entities/index.ts`. Nest registers those class references (required under the webpack-bundled API).

## Migrations

Migration classes live in `src/lib/migrations/`.

1. Ensure `DATABASE_URL` is set.
2. Generate: `bun run migration:generate` (builds `@shipshout/database` first, then diffs schema).
3. Apply: `bun run migration:run`
4. Revert last: `bun run migration:revert`

CLI discovery (`typeorm.config.ts`) uses filesystem globs on compiled entities + migration sources:

- entities: `libs/database/dist/lib/entities/**/*.entity.{ts,js}`
- migrations: `libs/database/src/lib/migrations/**/*.{ts,js}`

## Repositories

Feature modules must **not** call `TypeOrmModule.forFeature`. Register `DatabaseModule.forRootAsync` once in the app. Custom repos are normal Nest providers:

```ts
@Injectable()
export class GithubConnectionRepository extends BaseRepository<GithubConnectionEntity> {
    constructor(@InjectDataSource() dataSource: DataSource) {
        super(GithubConnectionEntity, dataSource);
    }
}

@Module({ providers: [GithubConnectionRepository] })
export class RepositoryModule {}
```
