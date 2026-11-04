import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const migrationUp = await readFile(new URL('../migrations/sql/001_initial_schema.up.sql', import.meta.url), 'utf8');
const migrationDown = await readFile(new URL('../migrations/sql/001_initial_schema.down.sql', import.meta.url), 'utf8');

test('initial schema migrates up, enforces ledger rules, rolls back, and migrates again', async () => {
  const database = new PGlite();

  try {
    await database.exec(migrationUp);
    const tables = await database.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
    );
    assert.ok(tables.rows.some((row) => row.table_name === 'journal_entries'));
    assert.ok(tables.rows.some((row) => row.table_name === 'outbox_events'));
    assert.ok(tables.rows.some((row) => row.table_name === 'user_sessions'));
    const roleMatrix = await database.query<{ role_count: number; permission_count: number; assignment_count: number }>(
      `SELECT
         (SELECT count(*) FROM roles)::int AS role_count,
         (SELECT count(*) FROM permissions)::int AS permission_count,
         (SELECT count(*) FROM role_permissions)::int AS assignment_count`
    );
    assert.deepEqual(roleMatrix.rows[0], { role_count: 6, permission_count: 13, assignment_count: 44 });

    const organization = await database.query<{ id: string }>(
      `INSERT INTO organizations (name) VALUES ('Test Org') RETURNING id`
    );
    const organizationId = organization.rows[0].id;
    const user = await database.query<{ id: string }>(
      `INSERT INTO users (oidc_subject, email, full_name) VALUES ('subject-1', 'User@Example.test', 'Test User') RETURNING id`
    );
    const userId = user.rows[0].id;
    await database.query(
      `INSERT INTO organization_memberships (organization_id, user_id, role_key) VALUES ($1, $2, 'SUPER_ADMIN')`,
      [organizationId, userId]
    );
    await database.query(
      `INSERT INTO user_sessions (organization_id, user_id, session_token_hash, csrf_token_hash, expires_at)
       VALUES ($1, $2, $3, $4, now() + interval '1 hour')`,
      [organizationId, userId, Buffer.alloc(32, 1), Buffer.alloc(32, 2)]
    );
    const otherOrganization = await database.query<{ id: string }>(
      `INSERT INTO organizations (name) VALUES ('Other Org') RETURNING id`
    );
    await assert.rejects(
      database.query(
        `INSERT INTO user_sessions (organization_id, user_id, session_token_hash, csrf_token_hash, expires_at)
         VALUES ($1, $2, $3, $4, now() + interval '1 hour')`,
        [otherOrganization.rows[0].id, userId, Buffer.alloc(32, 3), Buffer.alloc(32, 4)]
      ),
      /user_sessions_organization_id_user_id_fkey/i
    );
    const period = await database.query<{ id: string }>(
      `INSERT INTO accounting_periods (organization_id, name, starts_on, ends_on)
       VALUES ($1, 'FY26-10', '2026-10-01', '2026-10-31') RETURNING id`,
      [organizationId]
    );
    const periodId = period.rows[0].id;
    const accounts = await database.query<{ id: string }>(
      `INSERT INTO chart_accounts (organization_id, code, name, category, normal_balance)
       VALUES ($1, '1010', 'Cash', 'ASSET', 'DEBIT'),
              ($1, '3010', 'Capital', 'EQUITY', 'CREDIT')
       RETURNING id`,
      [organizationId]
    );

    await database.exec('BEGIN');
    const invalidEntry = await database.query<{ id: string }>(
      `INSERT INTO journal_entries
        (organization_id, entry_number, transaction_date, memo, source_module, period_id, posted_by)
       VALUES ($1, 'JE-INVALID', '2026-10-01', 'Unbalanced', 'GENERAL', $2, $3) RETURNING id`,
      [organizationId, periodId, userId]
    );
    const postingTriggers = await database.query<{ tgname: string }>(
      `SELECT tgname FROM pg_trigger WHERE tgrelid = 'journal_entries'::regclass AND NOT tgisinternal`
    );
    assert.ok(postingTriggers.rows.some((trigger) => trigger.tgname === 'journal_entry_validate_posting'));
    await database.query(
      `INSERT INTO journal_lines (organization_id, journal_entry_id, line_number, account_id, side, amount)
       VALUES ($1, $2, 1, $3, 'DEBIT', 10)`,
      [organizationId, invalidEntry.rows[0].id, accounts.rows[0].id]
    );
    await assert.rejects(
      database.query(`UPDATE journal_entries SET status = 'POSTED', posted_at = now() WHERE id = $1`, [invalidEntry.rows[0].id]),
      /balanced debit and credit/i
    );
    await database.exec('ROLLBACK');

    await database.exec(`
      BEGIN;
      INSERT INTO journal_entries
        (organization_id, entry_number, transaction_date, memo, source_module, period_id, posted_by)
      VALUES ('${organizationId}', 'JE-VALID', '2026-10-01', 'Balanced', 'GENERAL', '${periodId}', '${userId}');
      INSERT INTO journal_lines (organization_id, journal_entry_id, line_number, account_id, side, amount)
      SELECT '${organizationId}', id, 1, '${accounts.rows[0].id}', 'DEBIT', 10 FROM journal_entries WHERE entry_number = 'JE-VALID';
      INSERT INTO journal_lines (organization_id, journal_entry_id, line_number, account_id, side, amount)
      SELECT '${organizationId}', id, 2, '${accounts.rows[1].id}', 'CREDIT', 10 FROM journal_entries WHERE entry_number = 'JE-VALID';
      UPDATE journal_entries SET status = 'POSTED', posted_at = now() WHERE entry_number = 'JE-VALID';
      COMMIT;
    `);

    await assert.rejects(
      database.exec(`UPDATE journal_entries SET memo = 'Tampered' WHERE entry_number = 'JE-VALID'`),
      /immutable/i
    );
    await assert.rejects(
      database.query(`INSERT INTO users (oidc_subject, email, full_name) VALUES ('subject-2', 'user@example.test', 'Duplicate')`),
      /users_email_ci_idx|duplicate key/i
    );

    await database.exec(migrationDown);
    await database.exec(migrationUp);
    const remigrated = await database.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'journal_entries'`
    );
    assert.equal(remigrated.rows.length, 1);
  } finally {
    await database.close();
  }
});