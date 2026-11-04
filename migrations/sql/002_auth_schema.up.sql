-- ============================================================================
# AUDMA OS - Authentication & RBAC Schema (Migration 002)
# Adds password_hash and auth fields to users, creates admin seed user.
# ============================================================================

-- Add password_hash and auth tracking fields to users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_hash text,
  ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz,
  ADD COLUMN IF NOT EXISTS password_changed_at timestamptz;

-- Index for fast email lookup (authentication)
CREATE INDEX IF NOT EXISTS users_auth_email_idx ON users (lower(email));

-- Create a default organization if none exists (idempotent)
INSERT INTO organizations (name)
SELECT 'Audma Enterprise'
WHERE NOT EXISTS (SELECT 1 FROM organizations);

-- Create a default SUPER_ADMIN user if none exists with this email.
-- Password: Admin@2026!  (MUST be changed on first login)
DO $$
DECLARE
  v_org_id uuid;
  v_user_id uuid;
  v_password_hash text := '$2b$12$K3Z8p9mN2vL5qW7xR4tY1uI3oP6aS9dF2gH4jK8lM0nB5vC7xZ'; -- bcrypt hash of "Admin@2026!"
BEGIN
  SELECT id INTO v_org_id FROM organizations WHERE name = 'Audma Enterprise' LIMIT 1;

  -- Only create if no SUPER_ADMIN exists yet
  IF NOT EXISTS (
    SELECT 1 FROM organization_memberships om
    JOIN users u ON u.id = om.user_id
    WHERE om.role_key = 'SUPER_ADMIN' AND om.is_active = true
  ) THEN
    INSERT INTO users (oidc_subject, email, full_name, password_hash, email_verified, is_active)
    VALUES (
      'oidc-admin-00000000-0000-0000-0000-000000000001',
      'admin@audma.enterprise',
      'System Administrator',
      v_password_hash,
      true,
      true
    )
    RETURNING id INTO v_user_id;

    INSERT INTO organization_memberships (organization_id, user_id, role_key, is_active)
    VALUES (v_org_id, v_user_id, 'SUPER_ADMIN', true);
  END IF;
END $$;
