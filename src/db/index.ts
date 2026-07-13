import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema.js';

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required. Set it in Render env vars or your local .env');
}

const isRenderInternal = /@dpg-[a-z0-9]+(-a)?\//.test(connectionString);
// A local Postgres (dev) has no SSL listener, so forcing SSL fails the connection.
const isLocal = /@?(localhost|127\.0\.0\.1)[:/]/.test(connectionString);

export const pool = new Pool({
  connectionString,
  ssl: isRenderInternal || isLocal ? false : { rejectUnauthorized: false },
  max: 10,
});

export const db = drizzle(pool, { schema });
export { schema };
