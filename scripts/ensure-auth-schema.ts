import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required');

const pool = new Pool({ connectionString: databaseUrl });

try {
    await pool.query('CREATE SCHEMA IF NOT EXISTS auth');
    console.log('Ensured schema "auth" exists');
} finally {
    await pool.end();
}
