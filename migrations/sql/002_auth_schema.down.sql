-- ============================================================================
# AUDMA OS - Auth Schema Rollback (Migration 002 down)
# ============================================================================

ALTER TABLE users
  DROP COLUMN IF EXISTS password_hash,
  DROP COLUMN IF EXISTS email_verified,
  DROP COLUMN IF EXISTS last_login_at,
  DROP COLUMN IF EXISTS password_changed_at;

DROP INDEX IF EXISTS users_auth_email_idx;
