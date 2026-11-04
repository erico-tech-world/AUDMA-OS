import { BaseRepository } from './base';

/**
 * Receipt Repository — PostgreSQL persistence for expense receipts.
 */

export class ReceiptRepository extends BaseRepository {
  async listReceipts(organizationId: string, status?: string, claimantId?: string) {
    let query = `SELECT * FROM receipts WHERE organization_id = $1`;
    const params: unknown[] = [organizationId];
    let paramIndex = 2;

    if (status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(status);
    }
    if (claimantId) {
      query += ` AND claimant_user_id = $${paramIndex++}`;
      params.push(claimantId);
    }
    query += ` ORDER BY created_at DESC`;

    const result = await this.query(query, params);
    return result.rows;
  }

  async createReceipt(organizationId: string, data: {
    claimant_user_id: string;
    merchant_name: string;
    transaction_date: string;
    currency: string;
    amount: string;
    status?: string;
    reviewer_user_id?: string;
    journal_entry_id?: string;
    idempotency_key?: string;
  }) {
    const result = await this.query(
      `INSERT INTO receipts (organization_id, claimant_user_id, merchant_name, transaction_date, currency, amount, status, reviewer_user_id, journal_entry_id, idempotency_key)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [organizationId, data.claimant_user_id, data.merchant_name, data.transaction_date, data.currency, data.amount, data.status || 'DRAFT', data.reviewer_user_id || null, data.journal_entry_id || null, data.idempotency_key || null]
    );
    return result.rows[0];
  }

  async updateReceiptStatus(id: string, organizationId: string, status: string, reviewerId?: string, journalEntryId?: string, rejectionReason?: string) {
    const result = await this.query(
      `UPDATE receipts SET status = $1, reviewer_user_id = COALESCE($2, reviewer_user_id), journal_entry_id = COALESCE($3, journal_entry_id) WHERE id = $4 AND organization_id = $5 RETURNING *`,
      [status, reviewerId || null, journalEntryId || null, id, organizationId]
    );
    return result.rows[0];
  }

  async getReceiptSummary(organizationId: string) {
    const result = await this.query(
      `SELECT
              COUNT(*) FILTER (WHERE status = 'PENDING_APPROVAL') AS pending_count,
              COALESCE(SUM(amount) FILTER (WHERE status = 'PENDING_APPROVAL'), '0') AS pending_amount,
              COALESCE(SUM(amount) FILTER (WHERE status IN ('APPROVED', 'PAID_REIMBURSED')), '0') AS approved_amount,
              COALESCE(SUM(amount), '0') AS total_amount,
              COUNT(*) AS total_count
       FROM receipts
       WHERE organization_id = $1`,
      [organizationId]
    );
    return result.rows[0];
  }
}
