import { Pool, PoolClient } from 'pg';

let pool: Pool | null = null;

/**
 * Get or create the PostgreSQL connection pool.
 * Returns null if DATABASE_URL is not configured.
 */
export function getDbPool(): Pool | null {
  if (pool) return pool;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return null;
  pool = new Pool({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    max: Number(process.env.PG_POOL_MAX || 10),
    statement_timeout: 5000,
    query_timeout: 6000,
    ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });
  return pool;
}

/** Get a client from the pool (for transactions). */
export async function getDbClient(): Promise<PoolClient | null> {
  const p = getDbPool();
  if (!p) return null;
  return p.connect();
}

/** Close the pool (graceful shutdown). */
export async function closeDbPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/** Check if the database is reachable. */
export async function dbIsHealthy(): Promise<boolean> {
  const p = getDbPool();
  if (!p) return false;
  try {
    await p.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}
