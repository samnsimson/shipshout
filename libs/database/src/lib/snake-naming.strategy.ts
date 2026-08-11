import { DefaultNamingStrategy, NamingStrategyInterface } from 'typeorm';
import { snakeCase } from 'typeorm/util/StringUtils';

/** Maps camelCase entity properties to snake_case column names. */
export class SnakeNamingStrategy extends DefaultNamingStrategy implements NamingStrategyInterface {
    override columnName(propertyName: string, customName: string | undefined, embeddedPrefixes: string[]): string {
        const name = customName ?? propertyName;
        if (embeddedPrefixes.length) return snakeCase(embeddedPrefixes.join('_') + '_' + name);
        return snakeCase(name);
    }

    override relationName(propertyName: string): string {
        return snakeCase(propertyName);
    }

    override joinColumnName(relationName: string, referencedColumnName: string): string {
        return snakeCase(`${relationName}_${referencedColumnName}`);
    }

    override joinTableColumnName(tableName: string, propertyName: string, columnName?: string): string {
        return snakeCase(`${tableName}_${columnName ?? propertyName}`);
    }

    override joinTableInverseColumnName(tableName: string, propertyName: string, columnName?: string): string {
        return snakeCase(`${tableName}_${columnName ?? propertyName}`);
    }
}

export const databaseNamingStrategy = new SnakeNamingStrategy();
