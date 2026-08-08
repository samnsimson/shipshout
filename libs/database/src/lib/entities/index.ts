import { EntitySchema } from 'typeorm';

export type DatabaseEntity = (new () => object) | EntitySchema;

export const ENTITIES: DatabaseEntity[] = [];
