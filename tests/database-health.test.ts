import assert from 'node:assert/strict';
import test from 'node:test';
import { checkDatabaseConnection, closeDatabasePool } from '../src/lib/database';

test('database health is unavailable when no connection URL is configured', async () => {
  const savedUrl = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;

  try {
    assert.deepEqual(await checkDatabaseConnection(), { healthy: false, latencyMs: 0 });
  } finally {
    await closeDatabasePool();
    if (savedUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = savedUrl;
  }
});