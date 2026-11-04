import bcrypt from 'bcryptjs';
import { Pool } from 'pg';

export const SALT_ROUNDS = 12;

/** Hash a plaintext password for storage. */
export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters.');
  }
  return bcrypt.hash(password, SALT_ROUNDS);
}

/** Verify a plaintext password against a stored hash. */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  permissions: string[];
  is_active: boolean;
  password_hash?: string; // Populated when fetched for password verification
}

/**
 * Authenticate a user by email + password against PostgreSQL.
 * Returns null if user not found, inactive, wrong password, or OIDC-only (no password hash).
 */
export async function authenticateUser(
  pool: Pool,
  email: string,
  password: string
): Promise<AuthUser | null> {
  const result = await pool.query(
    `SELECT
       u.id,
       u.email,
       u.full_name,
       u.role_key AS role,
       u.is_active,
       u.password_hash,
       COALESCE(
         array_agg(DISTINCT p.permission_key) FILTER (WHERE p.permission_key IS NOT NULL),
         '{}'
       ) AS permissions
     FROM users u
     LEFT JOIN organization_memberships om
       ON om.user_id = u.id AND om.is_active = true
     LEFT JOIN role_permissions rp
       ON rp.role_key = om.role_key
     LEFT JOIN permissions p
       ON p.permission_key = rp.permission_key
     WHERE LOWER(u.email) = LOWER($1)
     GROUP BY u.id, u.email, u.full_name, u.role_key, u.is_active, u.password_hash`,
    [email.trim().toLowerCase()]
  );

  const row = result.rows[0];
  if (!row) return null;
  if (!row.is_active) return null;
  if (!row.password_hash) return null; // OIDC-only user, no password auth

  const valid = await verifyPassword(password, row.password_hash);
  if (!valid) return null;

  return {
    id: row.id,
    email: row.email,
    full_name: row.full_name,
    role: row.role,
    permissions: row.permissions || [],
    is_active: row.is_active,
  };
}

/** Look up a user by ID (for session deserialization). */
export async function findUserById(pool: Pool, id: string): Promise<AuthUser | null> {
  const result = await pool.query(
    `SELECT
       u.id,
       u.email,
       u.full_name,
       u.role_key AS role,
       u.is_active,
       COALESCE(
         array_agg(DISTINCT p.permission_key) FILTER (WHERE p.permission_key IS NOT NULL),
         '{}'
       ) AS permissions
     FROM users u
     LEFT JOIN organization_memberships om
       ON om.user_id = u.id AND om.is_active = true
     LEFT JOIN role_permissions rp
       ON rp.role_key = om.role_key
     LEFT JOIN permissions p
       ON p.permission_key = rp.permission_key
     WHERE u.id = $1
     GROUP BY u.id, u.email, u.full_name, u.role_key, u.is_active`,
    [id]
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    id: row.id,
    email: row.email,
    full_name: row.full_name,
    role: row.role,
    permissions: row.permissions || [],
    is_active: row.is_active,
  };
}

/** Generate a secure random session secret if none provided. */
export function generateSessionSecret(): string {
  return require('crypto').randomBytes(32).toString('base64url');
}
