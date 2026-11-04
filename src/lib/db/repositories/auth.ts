import { BaseRepository } from './base';

/**
 * Auth Repository — PostgreSQL persistence for users, sessions, audit logs, outbox events.
 */

export class AuthRepository extends BaseRepository {
  // ==================== Users ====================

  async findUserByEmail(email: string) {
    const result = await this.query(
      `SELECT u.*, om.role_key AS role
       FROM users u
       LEFT JOIN organization_memberships om ON om.user_id = u.id AND om.is_active = true
       WHERE LOWER(u.email) = LOWER($1)
       LIMIT 1`,
      [email]
    );
    return result.rows[0];
  }

  async findUserById(id: string) {
    const result = await this.query(
      `SELECT u.*, om.role_key AS role
       FROM users u
       LEFT JOIN organization_memberships om ON om.user_id = u.id AND om.is_active = true
       WHERE u.id = $1
       LIMIT 1`,
      [id]
    );
    return result.rows[0];
  }

  async updateLastLogin(id: string) {
    await this.query('UPDATE users SET last_login_at = now() WHERE id = $1', [id]);
  }

  async updatePassword(id: string, passwordHash: string) {
    await this.query(
      `UPDATE users SET password_hash = $1, password_changed_at = now() WHERE id = $2`,
      [passwordHash, id]
    );
  }

  async listUsers(organizationId: string) {
    const result = await this.query(
      `SELECT u.id, u.email, u.full_name, u.role_key AS role, u.is_active, u.last_login_at, u.created_at,
              om.role_key AS membership_role
       FROM users u
       LEFT JOIN organization_memberships om ON om.user_id = u.id AND om.is_active = true
       WHERE u.id IN (SELECT user_id FROM organization_memberships WHERE organization_id = $1 AND is_active = true)
       ORDER BY u.full_name`,
      [organizationId]
    );
    return result.rows;
  }

  // ==================== Audit Logs ====================

  async createAuditLog(data: {
    organization_id?: string;
    actor_user_id?: string;
    action: string;
    target_type: string;
    target_id: string;
    correlation_id?: string;
    details?: Record<string, unknown>;
  }) {
    const result = await this.query(
      `INSERT INTO audit_logs (organization_id, actor_user_id, action, target_type, target_id, correlation_id, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.organization_id || null,
        data.actor_user_id || null,
        data.action,
        data.target_type,
        data.target_id,
        data.correlation_id || null,
        data.details ? JSON.stringify(data.details) : '{}',
      ]
    );
    return result.rows[0];
  }

  async listAuditLogs(organizationId?: string, limit = 100, offset = 0) {
    if (organizationId) {
      const result = await this.query(
        `SELECT * FROM audit_logs WHERE organization_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
        [organizationId, limit, offset]
      );
      return result.rows;
    }
    const result = await this.query(
      `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  }

  // ==================== Outbox Events ====================

  async createOutboxEvent(data: {
    organization_id: string;
    event_type: string;
    aggregate_type: string;
    aggregate_id: string;
    deduplication_key: string;
    payload: Record<string, unknown>;
  }) {
    const result = await this.query(
      `INSERT INTO outbox_events (organization_id, event_type, aggregate_type, aggregate_id, deduplication_key, payload)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [data.organization_id, data.event_type, data.aggregate_type, data.aggregate_id, data.deduplication_key, JSON.stringify(data.payload)]
    );
    return result.rows[0];
  }

  async listPendingOutboxEvents(limit = 50) {
    const result = await this.query(
      `SELECT * FROM outbox_events
       WHERE status = 'PENDING' AND available_at <= now()
       ORDER BY available_at ASC, created_at ASC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  async markOutboxEventPublished(eventId: string) {
    await this.query(
      `UPDATE outbox_events SET status = 'PUBLISHED', published_at = now() WHERE id = $1`,
      [eventId]
    );
  }

  async markOutboxEventFailed(eventId: string) {
    await this.query(
      `UPDATE outbox_events SET status = 'FAILED', attempts = attempts + 1 WHERE id = $1`,
      [eventId]
    );
  }
}
