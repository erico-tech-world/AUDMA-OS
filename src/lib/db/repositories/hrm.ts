import { BaseRepository } from './base';

/**
 * HRM Repository — PostgreSQL persistence for Human Resource Management domain.
 */

export class HRMRepository extends BaseRepository {
  // ==================== Departments ====================

  async listDepartments(organizationId: string) {
    const result = await this.query(
      `SELECT d.*,
              COUNT(e.id) FILTER (WHERE e.status = 'ACTIVE') AS active_employee_count
       FROM departments d
       LEFT JOIN employees e ON e.department = d.name AND e.organization_id = $1
       WHERE d.organization_id = $1
       GROUP BY d.id
       ORDER BY d.name`,
      [organizationId]
    );
    return result.rows;
  }

  async createDepartment(organizationId: string, data: {
    code: string;
    name: string;
    description: string;
    head_of_department_id?: string;
    head_of_department_name?: string;
    head_of_department_email?: string;
    budget_annual: string;
    approval_privileges?: string[];
  }) {
    const result = await this.query(
      `INSERT INTO departments (organization_id, code, name, description, head_of_department_id, head_of_department_name, head_of_department_email, budget_annual, approval_privileges)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [organizationId, data.code, data.name, data.description, data.head_of_department_id || null, data.head_of_department_name || null, data.head_of_department_email || null, data.budget_annual, data.approval_privileges || []]
    );
    return result.rows[0];
  }

  // ==================== Employees ====================

  async listEmployees(organizationId: string) {
    const result = await this.query(
      `SELECT * FROM employees WHERE organization_id = $1 ORDER BY first_name, last_name`,
      [organizationId]
    );
    return result.rows;
  }

  async getEmployeeById(id: string, organizationId: string) {
    const result = await this.query(
      `SELECT * FROM employees WHERE id = $1 AND organization_id = $2`,
      [id, organizationId]
    );
    return result.rows[0];
  }

  async createEmployee(organizationId: string, data: {
    employee_code: string;
    email: string;
    first_name: string;
    last_name: string;
    phone?: string;
    department: string;
    job_title: string;
    status?: string;
    hire_date: string;
    base_salary_monthly: string;
    allowances: string;
    tax_deduction_rate: string;
    pension_rate: string;
    bank_account?: string;
  }) {
    const result = await this.query(
      `INSERT INTO employees (organization_id, employee_code, email, first_name, last_name, phone, department, job_title, status, hire_date, base_salary_monthly, allowances, tax_deduction_rate, pension_rate, bank_account)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [organizationId, data.employee_code, data.email, data.first_name, data.last_name, data.phone || null, data.department, data.job_title, data.status || 'ACTIVE', data.hire_date, data.base_salary_monthly, data.allowances, data.tax_deduction_rate, data.pension_rate, data.bank_account || null]
    );
    return result.rows[0];
  }

  async updateEmployee(id: string, organizationId: string, updates: Partial<{
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    department: string;
    job_title: string;
    status: string;
    base_salary_monthly: string;
    allowances: string;
    tax_deduction_rate: string;
    pension_rate: string;
    bank_account: string;
  }>) {
    const fields = Object.keys(updates);
    if (fields.length === 0) throw new Error('No fields to update');
    const setClause = fields.map((f, i) => `${f} = $${i + 3}`).join(', ');
    const values = [id, organizationId, ...fields.map((f) => (updates as any)[f])];
    const result = await this.query(
      `UPDATE employees SET ${setClause} WHERE id = $1 AND organization_id = $2 RETURNING *`,
      values
    );
    return result.rows[0];
  }

  async deleteEmployee(id: string, organizationId: string): Promise<boolean> {
    const result = await this.query(
      `DELETE FROM employees WHERE id = $1 AND organization_id = $2`,
      [id, organizationId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  // ==================== Attendance ====================

  async listAttendance(organizationId: string, employeeId?: string, date?: string) {
    let query = `SELECT * FROM attendance_records WHERE organization_id = $1`;
    const params: unknown[] = [organizationId];
    let paramIndex = 2;

    if (employeeId) {
      query += ` AND employee_id = $${paramIndex++}`;
      params.push(employeeId);
    }
    if (date) {
      query += ` AND work_date = $${paramIndex++}`;
      params.push(date);
    }
    query += ` ORDER BY work_date DESC, clocked_in_at DESC`;

    const result = await this.query(query, params);
    return result.rows;
  }

  async recordAttendance(organizationId: string, data: {
    employee_id: string;
    work_date: string;
    clocked_in_at: string;
    clocked_out_at?: string;
  }) {
    // Check for existing open clock-in (prevent duplicates at DB level too)
    const existing = await this.query(
      `SELECT id FROM attendance_records WHERE organization_id = $1 AND employee_id = $2 AND work_date = $3 AND clocked_out_at IS NULL`,
      [organizationId, data.employee_id, data.work_date]
    );
    if (existing.rows.length > 0) {
      throw new Error('Employee already has an open clock-in for this date.');
    }

    const result = await this.query(
      `INSERT INTO attendance_records (organization_id, employee_id, work_date, clocked_in_at, clocked_out_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [organizationId, data.employee_id, data.work_date, data.clocked_in_at, data.clocked_out_at || null]
    );
    return result.rows[0];
  }

  async clockOut(attendanceId: string, organizationId: string, clockedOutAt: string) {
    const result = await this.query(
      `UPDATE attendance_records SET clocked_out_at = $1 WHERE id = $2 AND organization_id = $3 AND clocked_out_at IS NULL RETURNING *`,
      [clockedOutAt, attendanceId, organizationId]
    );
    return result.rows[0];
  }

  // ==================== Leave Requests ====================

  async listLeaveRequests(organizationId: string, employeeId?: string) {
    let query = `SELECT * FROM leave_requests WHERE organization_id = $1`;
    const params: unknown[] = [organizationId];
    if (employeeId) {
      query += ` AND employee_id = $2`;
      params.push(employeeId);
    }
    query += ` ORDER BY created_at DESC`;
    const result = await this.query(query, params);
    return result.rows;
  }

  async createLeaveRequest(organizationId: string, data: {
    employee_id: string;
    leave_type: string;
    starts_on: string;
    ends_on: string;
    total_days: string;
    reason: string;
  }) {
    const result = await this.query(
      `INSERT INTO leave_requests (organization_id, employee_id, leave_type, starts_on, ends_on, total_days, reason, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING')
       RETURNING *`,
      [organizationId, data.employee_id, data.leave_type, data.starts_on, data.ends_on, data.total_days, data.reason]
    );
    return result.rows[0];
  }

  async updateLeaveStatus(id: string, organizationId: string, status: 'APPROVED' | 'REJECTED', reviewedBy: string) {
    const result = await this.query(
      `UPDATE leave_requests SET status = $1, reviewed_by = $2 WHERE id = $3 AND organization_id = $4 AND status = 'PENDING' RETURNING *`,
      [status, reviewedBy, id, organizationId]
    );
    return result.rows[0];
  }

  // ==================== Payroll ====================

  async createPayrollRun(organizationId: string, data: {
    period_id: string;
    policy_version: string;
    created_by: string;
  }) {
    const result = await this.query(
      `INSERT INTO payroll_runs (organization_id, period_id, policy_version, status, created_by)
       VALUES ($1, $2, $3, 'CALCULATED', $4)
       RETURNING *`,
      [organizationId, data.period_id, data.policy_version, data.created_by]
    );
    return result.rows[0];
  }

  async createPayrollRecord(organizationId: string, data: {
    payroll_run_id: string;
    employee_id: string;
    base_salary: string;
    allowances: string;
    gross_salary: string;
    tax_deduction: string;
    pension_deduction: string;
    net_salary: string;
  }) {
    const result = await this.query(
      `INSERT INTO payroll_records (organization_id, payroll_run_id, employee_id, base_salary, allowances, gross_salary, tax_deduction, pension_deduction, net_salary)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [organizationId, data.payroll_run_id, data.employee_id, data.base_salary, data.allowances, data.gross_salary, data.tax_deduction, data.pension_deduction, data.net_salary]
    );
    return result.rows[0];
  }

  async listPayrollRecords(payrollRunId: string, organizationId: string) {
    const result = await this.query(
      `SELECT pr.*, e.first_name, e.last_name, e.department
       FROM payroll_records pr
       JOIN employees e ON e.id = pr.employee_id
       WHERE pr.payroll_run_id = $1 AND pr.organization_id = $2
       ORDER BY e.last_name, e.first_name`,
      [payrollRunId, organizationId]
    );
    return result.rows;
  }

  async finalizePayrollRun(payrollRunId: string, organizationId: string, journalEntryId?: string) {
    const result = await this.query(
      `UPDATE payroll_runs SET status = 'POSTED', journal_entry_id = COALESCE($1, journal_entry_id) WHERE id = $2 AND organization_id = $3 RETURNING *`,
      [journalEntryId || null, payrollRunId, organizationId]
    );
    return result.rows[0];
  }
}
