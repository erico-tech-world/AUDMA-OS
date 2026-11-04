import { Pool } from 'pg';

let pool: Pool | undefined;

export function getDatabasePool(): Pool | undefined {
  if (!process.env.DATABASE_URL) return undefined;
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 2_000,
      idleTimeoutMillis: 30_000,
      max: Number(process.env.PG_POOL_MAX || 10),
      statement_timeout: 3_000,
      query_timeout: 3_500,
      ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
    });
  }
  return pool;
}

export async function checkDatabaseConnection(): Promise<{ healthy: boolean; latencyMs: number }> {
  const database = getDatabasePool();
  if (!database) return { healthy: false, latencyMs: 0 };

  const startedAt = Date.now();
  try {
    await database.query('SELECT 1');
    return { healthy: true, latencyMs: Date.now() - startedAt };
  } catch {
    return { healthy: false, latencyMs: Date.now() - startedAt };
  }
}

export async function closeDatabasePool(): Promise<void> {
  if (!pool) return;
  const activePool = pool;
  pool = undefined;
  await activePool.end();
}