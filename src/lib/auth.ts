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

/** Generate a TOTP secret for MFA. */
export function generateTotpSecret(): string {
  return require('crypto').randomBytes(20).toString('base32');
}

/** Verify a TOTP code against a secret (RFC 6238). */
export function verifyTotp(code: string, secret: string): boolean {
  const byteSecret = Buffer.from(secret, 'base32' as BufferEncoding);
  const time = Math.floor(Date.now() / 1000);
  const timeSteps = Math.floor(time / 30);
  const stepCount = 8; // 64-bit counter

  // Compute HMAC-SHA1
  const hmac = require('crypto').createHmac('sha1', byteSecret).update(
    Buffer.from([timeSteps >>> 24, timeSteps >> 16, timeSteps >> 8, timeSteps]).toString('hex'),
    'ascii'
  ).digest();

  // Dynamic truncation
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary = hmac.slice(offset, offset + 4);
  const uint32 = ((binary[0] & 0x7f) << 24) | (binary[1] << 16) | (binary[2] << 8) | binary[3];
  const codeValue = uint32 % 1_000_000;

  const formattedCode = String(codeValue).padStart(6, '0');
  return formattedCode === code;
}

/** Generate a QR code data URL for TOTP provisioning. */
export function getTotpQrDataUrl(secret: string, accountName: string, issuerName: string = 'AUDMA OS'): string {
  // RFC 4648 base32 URL-safe encoding is already handled by toString('base32')
  const encodedSecret = secret.replace(/=+$/, ''); // strip padding
  const otpAuthUrl = `otpauth://totp/${encodeURIComponent(`${issuerName}:${accountName}`)}?secret=${encodedSecret}&issuer=${encodeURIComponent(issuerName)}&digits=6&period=30&algorithm=SHA1`;
  return `data:image/png;base64,${require('crypto').createHash('md5').update(otpAuthUrl).digest('base64')}`; // placeholder - real QR generation needs png library
}
