import { z } from 'zod';

// ============================================================================
// Zod Validation Schemas — AUDMA OS Production API
// All monetary values are strings to preserve Decimal.js precision.
// ============================================================================

// Auth
export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const ChangePasswordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z.string().min(8, 'New password must be at least 8 characters'),
});

export const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  full_name: z.string().min(1, 'Full name is required'),
  role: z.enum([
    'SUPER_ADMIN',
    'FINANCIAL_CONTROLLER',
    'HR_DIRECTOR',
    'DEPARTMENT_HEAD',
    'SENIOR_ACCOUNTANT',
    'STAFF_EMPLOYEE',
  ]).default('STAFF_EMPLOYEE'),
});

// Accounting — Chart of Accounts
export const CreateAccountSchema = z.object({
  code: z.string().min(1, 'Account code is required'),
  name: z.string().min(1, 'Account name is required'),
  category: z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']),
  normal_balance: z.enum(['DEBIT', 'CREDIT']),
  description: z.string().optional(),
  parent_account_id: z.string().uuid().optional(),
});

// Accounting — Journal Entry
export const JournalLineSchema = z.object({
  line_number: z.number().int().positive(),
  account_id: z.string().uuid(),
  description: z.string().optional(),
  side: z.enum(['DEBIT', 'CREDIT']),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Amount must have max 2 decimal places'),
});

export const CreateJournalEntrySchema = z.object({
  entry_number: z.string().min(1),
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date YYYY-MM-DD'),
  memo: z.string().min(1),
  source_module: z.enum(['GENERAL', 'ACCOUNTS_PAYABLE', 'HRM_PAYROLL', 'INVOICING', 'EXPENSE_RECEIPT']),
  period_id: z.string().uuid(),
  posted_by: z.string().uuid().optional(),
  idempotency_key: z.string().optional(),
  external_reference: z.string().optional(),
  lines: z.array(JournalLineSchema).min(2, 'At least 2 journal lines required'),
});

// Accounting — Vendor
export const CreateVendorSchema = z.object({
  name: z.string().min(1),
  tax_id: z.string().optional(),
  contact_email: z.string().email().optional(),
  phone: z.string().optional(),
  payment_terms: z.enum(['NET_15', 'NET_30', 'NET_60', 'DUE_ON_RECEIPT']),
  default_expense_account_id: z.string().uuid().optional(),
});

// Accounting — Invoice
export const CreateInvoiceSchema = z.object({
  vendor_id: z.string().uuid(),
  invoice_number: z.string().min(1),
  invoice_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  currency: z.string().length(3).default('USD'),
  subtotal: z.string(),
  tax_amount: z.string(),
  total_amount: z.string(),
  status: z.enum(['DRAFT', 'PENDING_AUDIT', 'POSTED_TO_GL', 'PAID']).default('PENDING_AUDIT'),
  journal_entry_id: z.string().uuid().optional(),
  external_reference: z.string().optional(),
  idempotency_key: z.string().optional(),
});

export const UpdateInvoiceStatusSchema = z.object({
  status: z.enum(['DRAFT', 'PENDING_AUDIT', 'POSTED_TO_GL', 'PAID']),
  journal_entry_id: z.string().uuid().optional(),
});

// HRM — Department
export const CreateDepartmentSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  head_of_department_id: z.string().uuid().optional(),
  head_of_department_name: z.string().optional(),
  head_of_department_email: z.string().email().optional(),
  budget_annual: z.string(),
  approval_privileges: z.array(z.string()).default([]),
});

// HRM — Employee
export const CreateEmployeeSchema = z.object({
  employee_code: z.string().min(1),
  email: z.string().email(),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  phone: z.string().optional(),
  department: z.string().min(1),
  job_title: z.string().min(1),
  status: z.enum(['ACTIVE', 'ON_LEAVE', 'TERMINATED', 'PROBATION']).default('ACTIVE'),
  hire_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  base_salary_monthly: z.string(),
  allowances: z.string(),
  tax_deduction_rate: z.string(),
  pension_rate: z.string(),
  bank_account: z.string().optional(),
});

export const UpdateEmployeeSchema = z.object({
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  department: z.string().min(1).optional(),
  job_title: z.string().min(1).optional(),
  status: z.enum(['ACTIVE', 'ON_LEAVE', 'TERMINATED', 'PROBATION']).optional(),
  base_salary_monthly: z.string().optional(),
  allowances: z.string().optional(),
  tax_deduction_rate: z.string().optional(),
  pension_rate: z.string().optional(),
  bank_account: z.string().optional(),
});

// HRM — Attendance
export const RecordAttendanceSchema = z.object({
  employee_id: z.string().uuid(),
  work_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  clocked_in_at: z.string(),
  clocked_out_at: z.string().optional(),
});

// HRM — Leave Request
export const CreateLeaveRequestSchema = z.object({
  employee_id: z.string().uuid(),
  leave_type: z.enum(['ANNUAL', 'SICK', 'MATERNITY', 'UNPAID']),
  starts_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  ends_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  total_days: z.string(),
  reason: z.string().min(1),
});

export const UpdateLeaveStatusSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  reviewed_by: z.string().uuid(),
});

// HRM — Payroll
export const CreatePayrollRunSchema = z.object({
  period_id: z.string().uuid(),
  policy_version: z.string().min(1),
  created_by: z.string().uuid(),
});

export const CreatePayrollRecordSchema = z.object({
  payroll_run_id: z.string().uuid(),
  employee_id: z.string().uuid(),
  base_salary: z.string(),
  allowances: z.string(),
  gross_salary: z.string(),
  tax_deduction: z.string(),
  pension_deduction: z.string(),
  net_salary: z.string(),
});

// Receipts
export const CreateReceiptSchema = z.object({
  claimant_user_id: z.string().uuid().optional(),
  merchant_name: z.string().min(1),
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  currency: z.string().length(3).default('USD'),
  amount: z.string(),
  status: z.enum(['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'PAID_REIMBURSED']).default('DRAFT'),
  reviewer_user_id: z.string().uuid().optional(),
  journal_entry_id: z.string().uuid().optional(),
  idempotency_key: z.string().optional(),
});

export const UpdateReceiptStatusSchema = z.object({
  status: z.enum(['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'PAID_REIMBURSED']),
  reviewer_user_id: z.string().uuid().optional(),
  journal_entry_id: z.string().uuid().optional(),
  rejection_reason: z.string().optional(),
});

// Password Reset
export const PasswordResetRequestSchema = z.object({
  email: z.string().email(),
});

export const PasswordResetConfirmSchema = z.object({
  token: z.string().min(1),
  new_password: z.string().min(8),
});

// ============================================================================
// Validation Middleware Factory
// ============================================================================

import { Request, Response, NextFunction } from 'express';

export type ValidatedRequest<T> = Request & { validatedBody: T };

export function validateBody<T>(
  schema: z.ZodSchema<T>
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        code: 'VALIDATION_ERROR',
        error: result.error.flatten().fieldErrors,
      });
      return;
    }
    (req as ValidatedRequest<T>).validatedBody = result.data;
    next();
  };
}

export function validateQuery<T>(
  schema: z.ZodSchema<T>
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      res.status(400).json({
        code: 'VALIDATION_ERROR',
        error: result.error.flatten().fieldErrors,
      });
      return;
    }
    (req as ValidatedRequest<T>).validatedBody = result.data;
    next();
  };
}
