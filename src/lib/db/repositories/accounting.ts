import { BaseRepository } from './base';

/**
 * Accounting Repository — PostgreSQL persistence for the General Ledger domain.
 * All monetary values use numeric(20,2) to match Decimal.js precision.
 */

export class AccountingRepository extends BaseRepository {
  // ==================== Chart of Accounts ====================

  async listAccounts(organizationId: string) {
    const result = await this.query(
      `SELECT id, code, name, category, normal_balance, description,
              parent_account_id, is_active, current_balance, created_at
       FROM chart_accounts
       WHERE organization_id = $1
       ORDER BY code`,
      [organizationId]
    );
    return result.rows;
  }

  async getAccountById(id: string) {
    const result = await this.query(
      `SELECT * FROM chart_accounts WHERE id = $1`,
      [id]
    );
    return result.rows[0];
  }

  async getAccountByCode(organizationId: string, code: string) {
    const result = await this.query(
      `SELECT * FROM chart_accounts WHERE organization_id = $1 AND code = $2`,
      [organizationId, code]
    );
    return result.rows[0];
  }

  async createAccount(organizationId: string, data: {
    code: string;
    name: string;
    category: string;
    normal_balance: string;
    description?: string;
    parent_account_id?: string;
  }) {
    const result = await this.query(
      `INSERT INTO chart_accounts (organization_id, code, name, category, normal_balance, description, parent_account_id, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)
       RETURNING *`,
      [organizationId, data.code, data.name, data.category, data.normal_balance, data.description || '', data.parent_account_id || null]
    );
    return result.rows[0];
  }

  async updateAccountBalance(id: string, newBalance: string) {
    const result = await this.query(
      `UPDATE chart_accounts SET current_balance = $1 WHERE id = $2 RETURNING *`,
      [newBalance, id]
    );
    return result.rows[0];
  }

  // ==================== Journal Entries ====================

  async createJournalEntry(organizationId: string, data: {
    entry_number: string;
    transaction_date: string;
    memo: string;
    source_module: string;
    period_id: string;
    posted_by?: string;
    idempotency_key?: string;
    external_reference?: string;
    lines: {
      line_number: number;
      account_id: string;
      description: string;
      side: 'DEBIT' | 'CREDIT';
      amount: string;
    }[];
  }) {
    const { client, release } = await BaseRepository.transaction();
    const repo = new AccountingRepository(client);
    try {
      const entryResult = await repo.query(
        `INSERT INTO journal_entries (organization_id, entry_number, transaction_date, memo, source_module, period_id, posted_by, idempotency_key, external_reference, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'POSTED')
         RETURNING *`,
        [
          organizationId, data.entry_number, data.transaction_date, data.memo,
          data.source_module, data.period_id, data.posted_by || null,
          data.idempotency_key || null, data.external_reference || null
        ]
      );
      const entry = entryResult.rows[0];

      for (const line of data.lines) {
        await repo.query(
          `INSERT INTO journal_lines (organization_id, journal_entry_id, line_number, account_id, description, side, amount)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [organizationId, entry.id, line.line_number, line.account_id, line.description, line.side, line.amount]
        );
      }

      await release();
      return { ...entry, lines: data.lines };
    } catch (err) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // ignore
      }
      client.release();
      throw err;
    }
  }

  async listJournalEntries(organizationId: string, limit = 100, offset = 0) {
    const result = await this.query(
      `SELECT * FROM journal_entries
       WHERE organization_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [organizationId, limit, offset]
    );
    return result.rows;
  }

  async getJournalEntryWithLines(entryId: string, organizationId: string) {
    const entryResult = await this.query(
      `SELECT * FROM journal_entries WHERE id = $1 AND organization_id = $2`,
      [entryId, organizationId]
    );
    if (entryResult.rows.length === 0) return null;
    const entry = entryResult.rows[0];

    const linesResult = await this.query(
      `SELECT * FROM journal_lines WHERE journal_entry_id = $1 AND organization_id = $2 ORDER BY line_number`,
      [entryId, organizationId]
    );
    return { ...entry, lines: linesResult.rows };
  }

  // ==================== Vendors ====================

  async listVendors(organizationId: string) {
    const result = await this.query(
      `SELECT * FROM vendors WHERE organization_id = $1 ORDER BY name`,
      [organizationId]
    );
    return result.rows;
  }

  async createVendor(organizationId: string, data: {
    name: string;
    tax_id?: string;
    contact_email?: string;
    phone?: string;
    payment_terms: string;
    default_expense_account_id?: string;
  }) {
    const result = await this.query(
      `INSERT INTO vendors (organization_id, name, tax_id, contact_email, phone, payment_terms, default_expense_account_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [organizationId, data.name, data.tax_id || null, data.contact_email || null, data.phone || null, data.payment_terms, data.default_expense_account_id || null]
    );
    return result.rows[0];
  }

  // ==================== Vendor Invoices ====================

  async listInvoices(organizationId: string, status?: string) {
    if (status) {
      const result = await this.query(
        `SELECT * FROM vendor_invoices WHERE organization_id = $1 AND status = $2 ORDER BY created_at DESC`,
        [organizationId, status]
      );
      return result.rows;
    }
    const result = await this.query(
      `SELECT * FROM vendor_invoices WHERE organization_id = $1 ORDER BY created_at DESC`,
      [organizationId]
    );
    return result.rows;
  }

  async createInvoice(organizationId: string, data: {
    vendor_id: string;
    invoice_number: string;
    invoice_date: string;
    due_date: string;
    currency: string;
    subtotal: string;
    tax_amount: string;
    total_amount: string;
    status?: string;
    journal_entry_id?: string;
    external_reference?: string;
    idempotency_key?: string;
  }) {
    const result = await this.query(
      `INSERT INTO vendor_invoices (organization_id, vendor_id, invoice_number, invoice_date, due_date, currency, subtotal, tax_amount, total_amount, status, journal_entry_id, external_reference, idempotency_key)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [organizationId, data.vendor_id, data.invoice_number, data.invoice_date, data.due_date, data.currency, data.subtotal, data.tax_amount, data.total_amount, data.status || 'PENDING_AUDIT', data.journal_entry_id || null, data.external_reference || null, data.idempotency_key || null]
    );
    return result.rows[0];
  }

  async updateInvoiceStatus(id: string, status: string, journalEntryId?: string) {
    const result = await this.query(
      `UPDATE vendor_invoices SET status = $1, journal_entry_id = COALESCE($2, journal_entry_id) WHERE id = $3 RETURNING *`,
      [status, journalEntryId || null, id]
    );
    return result.rows[0];
  }

  async createInvoiceLine(organizationId: string, data: {
    invoice_id: string;
    line_number: number;
    description: string;
    quantity: string;
    unit_price: string;
    line_total: string;
    account_id: string;
  }) {
    const result = await this.query(
      `INSERT INTO vendor_invoice_lines (organization_id, invoice_id, line_number, description, quantity, unit_price, line_total, account_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [organizationId, data.invoice_id, data.line_number, data.description, data.quantity, data.unit_price, data.line_total, data.account_id]
    );
    return result.rows[0];
  }

  // ==================== Vendor Payments ====================

  async createVendorPayment(organizationId: string, data: {
    invoice_id: string;
    payment_reference: string;
    amount: string;
    paid_at: string;
    journal_entry_id?: string;
    idempotency_key: string;
  }) {
    const { client, release } = await BaseRepository.transaction();
    const repo = new AccountingRepository(client);
    try {
      const result = await repo.query(
        `INSERT INTO vendor_payments (organization_id, invoice_id, payment_reference, amount, paid_at, journal_entry_id, idempotency_key)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [organizationId, data.invoice_id, data.payment_reference, data.amount, data.paid_at, data.journal_entry_id || null, data.idempotency_key]
      );
      await release();
      return result.rows[0];
    } catch (err) {
      try { await client.query('ROLLBACK'); } catch { /* ignore */ }
      client.release();
      throw err;
    }
  }

  // ==================== Trial Balance / Reports ====================

  async generateTrialBalance(organizationId: string) {
    const result = await this.query(
      `SELECT code, name, category, normal_balance,
              CASE WHEN normal_balance = 'DEBIT' THEN current_balance ELSE '0.00' END AS debit_balance,
              CASE WHEN normal_balance = 'CREDIT' THEN current_balance ELSE '0.00' END AS credit_balance
       FROM chart_accounts
       WHERE organization_id = $1 AND is_active = true
       ORDER BY code`,
      [organizationId]
    );
    return result.rows;
  }

  async generateAPAging(organizationId: string, asOfDate: string) {
    const result = await this.query(
      `SELECT v.id AS vendor_id, v.name AS vendor_name,
              SUM(CASE WHEN CURRENT_DATE - vi.due_date <= 30 THEN vi.total_amount ELSE 0 END) AS current,
              SUM(CASE WHEN CURRENT_DATE - vi.due_date BETWEEN 31 AND 60 THEN vi.total_amount ELSE 0 END) AS days_31_to_60,
              SUM(CASE WHEN CURRENT_DATE - vi.due_date BETWEEN 61 AND 90 THEN vi.total_amount ELSE 0 END) AS days_61_to_90,
              SUM(CASE WHEN CURRENT_DATE - vi.due_date > 90 THEN vi.total_amount ELSE 0 END) AS over_90_days,
              SUM(vi.total_amount) AS total_balance,
              COUNT(vi.id) AS invoice_count
       FROM vendor_invoices vi
       JOIN vendors v ON v.id = vi.vendor_id
       WHERE vi.organization_id = $1 AND vi.status != 'PAID'
       GROUP BY v.id, v.name
       ORDER BY v.name`,
      [organizationId]
    );
    return result.rows;
  }
}
