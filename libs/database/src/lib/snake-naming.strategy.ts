import { DefaultNamingStrategy, NamingStrategyInterface } from 'typeorm';

/** Maps camelCase / PascalCase identifiers to snake_case. */
function snakeCase(str: string): string {
    return str
        .replace(/([a-z\d])([A-Z])/g, '$1_$2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
        .toLowerCase();
}

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
