import { PoolClient } from 'pg';

/**
 * Base repository providing a database client.
 * If a transaction client is provided, all queries use it; otherwise uses the pool.
 */
export class BaseRepository {
  protected client: PoolClient | null;

  constructor(client: PoolClient | null = null) {
    this.client = client;
  }

  /** Query using the transaction client if available, otherwise the pool. */
  protected async query(text: string, params?: unknown[]): Promise<any> {
    const { getDbPool } = await import('../pool');
    const pool = getDbPool();
    if (!pool) {
      throw new Error('Database pool is not configured.');
    }
    if (this.client) {
      return this.client.query(text, params);
    }
    return pool.query(text, params);
  }

  /** Begin a transaction and return a new repository scoped to it. */
  static async transaction(): Promise<{ client: PoolClient; release: () => Promise<void> }> {
    const { getDbClient } = await import('../pool');
    const client = await getDbClient();
    if (!client) {
      throw new Error('Cannot obtain database client for transaction.');
    }
    await client.query('BEGIN');
    return {
      client,
      release: async () => {
        try {
          await client.query('COMMIT');
        } catch {
          try {
            await client.query('ROLLBACK');
          } catch {
            // ignore rollback errors
          }
        } finally {
          client.release();
        }
      },
    };
  }
}
