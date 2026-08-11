# database

Nest dynamic module wrapping TypeORM (Postgres).

## Building

Run `nx build database` to build the library.

## Running unit tests

Run `nx test database` to execute the unit tests via [Jest](https://jestjs.io).

## Migrations

Migration classes live in `src/lib/migrations/` (timestamp-prefixed files only — no registry file in that folder).

1. Ensure `DATABASE_URL` is set.
2. Generate: `bun run migration:generate` (builds `@shipshout/database` first, then diffs schema).
3. Apply: `bun run migration:run`
4. Revert last: `bun run migration:revert`

CLI discovery (`typeorm.config.ts`) uses absolute globs from the repo root:

- entities: `libs/database/dist/lib/entities/**/*.entity.{ts,js}` (compiled — Bun cannot emit TypeORM decorator metadata from `.ts` sources)
- migrations: `libs/database/src/lib/migrations/**/*.{ts,js}`

Nest `buildTypeOrmOptions` uses the same style relative to this package's `lib/` dir via `path.join(__dirname, 'entities/**/*.entity.{ts,js}')` and `path.join(__dirname, 'migrations/**/*.{ts,js}')`.

Feature modules must **not** call `TypeOrmModule.forFeature`. Register `DatabaseModule.forRootAsync` once in the app. Custom repos are normal Nest providers:

```ts
@Injectable()
export class GithubConnectionRepository extends BaseRepository<GithubConnectionEntity> {
    constructor(@InjectDataSource() dataSource: DataSource) {
        super(dataSource, GithubConnectionEntity);
    }
}

@Module({ providers: [GithubConnectionRepository] })
export class RepositoryModule {}
```
