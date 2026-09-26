export type UserRole =
  | 'SUPER_ADMIN'
  | 'FINANCIAL_CONTROLLER'
  | 'HR_DIRECTOR'
  | 'DEPARTMENT_HEAD'
  | 'SENIOR_ACCOUNTANT'
  | 'STAFF_EMPLOYEE';

export type GranularPermission =
  | 'accounting:view'
  | 'accounting:post_journal'
  | 'accounting:approve_invoice'
  | 'accounting:view_reports'
  | 'hrm:view'
  | 'hrm:manage_employees'
  | 'hrm:approve_leave'
  | 'hrm:run_payroll'
  | 'hrm:shift_signoff'
  | 'receipts:view'
  | 'receipts:submit'
  | 'receipts:approve'
  | 'admin:providers'
  | 'admin:audit_logs'
  | 'hod:vendor_po_approval'
  | 'hod:infrastructure_budget'
  | 'hod:payroll_signoff'
  | 'hod:workforce_planning'
  | 'hod:gl_posting_signoff'
  | 'hod:leave_approval'
  | 'hod:expense_review'
  | 'hod:shift_signoff';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl: string;
  permissions: GranularPermission[];
  department?: string;
  status?: 'ACTIVE' | 'SUSPENDED' | 'INVITED';
  timezone?: string;
}

export type AccountCategory = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';

export interface ChartAccount {
  id: string;
  code: string;
  name: string;
  category: AccountCategory;
  description: string;
  currentBalance: string; // Decimal string representation
  normalBalance: 'DEBIT' | 'CREDIT';
  isActive: boolean;
  parentCode?: string;
}

export interface JournalLine {
  id: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  description: string;
  debit: string; // Decimal string
  credit: string; // Decimal string
}

export interface JournalEntry {
  id: string;
  entryNumber: string;
  date: string; // YYYY-MM-DD
  memo: string;
  sourceModule: 'GENERAL' | 'ACCOUNTS_PAYABLE' | 'HRM_PAYROLL' | 'INVOICING' | 'EXPENSE_RECEIPT';
  referenceId?: string;
  lines: JournalLine[];
  totalDebit: string;
  totalCredit: string;
  postedBy: string;
  createdAt: string;
}

export interface Vendor {
  id: string;
  name: string;
  taxId: string;
  contactEmail: string;
  phone: string;
  category: string;
  paymentTerms: 'NET_15' | 'NET_30' | 'NET_60' | 'DUE_ON_RECEIPT';
  defaultExpenseAccountId: string;
  balanceDue: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendorId: string;
  vendorName: string;
  issueDate: string;
  status: 'DRAFT' | 'APPROVED' | 'FULFILLED' | 'CANCELLED';
  totalAmount: string;
  items: { description: string; quantity: number; unitPrice: string; total: string }[];
}

export type InvoiceStatus = 'DRAFT' | 'PENDING_AUDIT' | 'POSTED_TO_GL' | 'PAID';

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: string;
  total: string;
  expenseAccountId: string;
}

export interface VendorInvoice {
  id: string;
  invoiceNumber: string;
  vendorId: string;
  vendorName: string;
  vendorTaxId?: string;
  poNumber?: string;
  invoiceDate: string;
  dueDate: string;
  subtotal: string;
  taxRatePercent: string;
  taxAmount: string;
  totalAmount: string;
  status: InvoiceStatus;
  rawDocumentUrl?: string;
  lineItems: InvoiceLineItem[];
  journalEntryId?: string;
  aiExtracted?: boolean;
  aiConfidence?: number;
  auditNotes?: string;
  createdAt: string;
}

// HRM Domain Types
export type EmploymentStatus = 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED' | 'PROBATION';

export interface Employee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  jobTitle: string;
  status: EmploymentStatus;
  hireDate: string;
  baseSalaryMonthly: string;
  allowances: string;
  taxDeductionRate: string; // e.g. "15" for 15%
  pensionRate: string; // e.g. "5" for 5%
  bankAccount: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  clockInTime: string;
  clockOutTime?: string;
  hoursWorked: string;
  status: 'PRESENT' | 'LATE' | 'HALF_DAY' | 'ABSENT';
}

export interface AttendanceConfig {
  workStartTime: string; // e.g. "09:00"
  workEndTime: string; // e.g. "17:00"
  lunchBreakMinutes: number; // e.g. 60 (User-editable lunch break duration in minutes)
  standardDailyHours: number; // e.g. 7.0 (User-editable net worked hours timeframe)
  standardDailyDurationFormatted?: string; // e.g. "07:00:00" / "07h 00m 00s"
  lateGraceMinutes: number; // e.g. 15
  overtimeMultiplier: string; // e.g. "1.5"
  overtimeThresholdHours: number; // e.g. 8
  defaultShift: string; // e.g. "Standard Day Shift (09:00 - 17:00)"
  biometricSyncIntervalMinutes: number; // e.g. 30
  customLoggingTemplate: string;
  autoDeductLunchBreak: boolean;
  requireGeoLocation: boolean;
  officeLatitude?: number; // e.g. 37.7749
  officeLongitude?: number; // e.g. -122.4194
  allowedGeoRadiusMeters?: number; // e.g. 500
  officeLocationName?: string; // e.g. "AUDMA Global HQ • 100 Innovation Way"
}

export interface Department {
  id: string;
  code: string; // e.g. "FIN", "HR", "ENG"
  name: string;
  description: string;
  headOfDepartmentId: string;
  headOfDepartmentName: string;
  headOfDepartmentEmail: string;
  budgetAnnual: string;
  employeeCount: number;
  approvalPrivileges: string[]; // e.g. ["leave_approval", "expense_review", "shift_signoff"]
  createdAt: string;
}

export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type LeaveType = 'ANNUAL' | 'SICK' | 'MATERNITY' | 'UNPAID';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: LeaveStatus;
  approvedBy?: string;
}

export interface PayrollRecord {
  id: string;
  payrollPeriodId: string;
  employeeId: string;
  employeeName: string;
  department: string;
  baseSalary: string;
  allowances: string;
  grossSalary: string;
  taxDeduction: string;
  pensionDeduction: string;
  totalDeductions: string;
  netSalary: string;
  status: 'DRAFT' | 'CALCULATED' | 'PAID';
}

export interface PayrollPeriod {
  id: string;
  periodName: string; // e.g. "September 2026"
  startDate: string;
  endDate: string;
  status: 'OPEN' | 'PROCESSING' | 'FINALIZED';
  totalGross: string;
  totalDeductions: string;
  totalNet: string;
  employeeCount: number;
  journalEntryId?: string; // Linked GL entry
  records: PayrollRecord[];
  finalizedAt?: string;
}

// Pluggable Provider Types
export type DBProviderType = 'neon' | 'supabase' | 'postgres_local' | 'in_memory';
export type StorageProviderType = 'cloudflare_r2' | 'supabase_storage' | 'minio' | 'local';
export type AIProviderType = 'gemini' | 'groq' | 'ollama' | 'openai' | 'claude' | 'deepseek' | 'local_ocr';
export type QueueProviderType = 'bullmq' | 'memory';

export interface ProviderHealth {
  name: string;
  type: string;
  status: 'HEALTHY' | 'CONNECTING' | 'DEGRADED' | 'STANDBY';
  latencyMs: number;
  endpoint: string;
  description: string;
}

export interface AUDMAProviderConfig {
  dbProvider: DBProviderType;
  storageProvider: StorageProviderType;
  aiProvider: AIProviderType;
  queueProvider: QueueProviderType;
}

// Domain Event
export interface DomainEvent<T = unknown> {
  id: string;
  name: string; // e.g. "hrm.payroll.finalized", "accounting.invoice.approved"
  timestamp: string;
  source: string;
  payload: T;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  domain: 'CORE' | 'ACCOUNTING' | 'HRM' | 'PROVIDERS';
  details: string;
}

// ==================== RECEIPT & DAILY EXPENSE TYPES ====================
export type ReceiptExpenseCategory =
  | 'FUEL_LOGISTICS'
  | 'TRAVEL_ENTERTAINMENT'
  | 'OFFICE_SUPPLIES'
  | 'MEALS_SUBSISTENCE'
  | 'UTILITIES_OPERATIONS'
  | 'SOFTWARE_SUBSCRIPTIONS'
  | 'OTHER';

export type ExpenseClaimStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'PENDING_AUDIT'
  | 'APPROVED'
  | 'REJECTED'
  | 'PAID_REIMBURSED';

export interface ExpenseReceipt {
  id: string;
  claimNumber: string; // e.g. "EXP-2026-001"
  employeeId: string;
  employeeName: string;
  merchantName: string;
  transactionDate: string; // YYYY-MM-DD
  category: ReceiptExpenseCategory;
  expenseAccountId: string; // e.g. "acc-5200", "acc-5300", "acc-5400", "acc-5500"
  accountCode: string; // "5200", "5300", "5400", "5500"
  accountName: string;
  subtotal: string;
  taxAmount: string;
  totalAmount: string;
  currency: string;
  purposeMemo: string;
  status: ExpenseClaimStatus;
  rawReceiptUrl?: string;
  aiExtracted?: boolean;
  aiConfidence?: number;
  aiSuggestedAccountCode?: string;
  rejectionReason?: string;
  approvedBy?: string;
  approvedAt?: string;
  journalEntryId?: string;
  createdAt: string;
}

// ==================== AP AGING ANALYTICS TYPES ====================
export interface APAgingBucket {
  current: string;      // 0 - 30 days
  days31To60: string;   // 31 - 60 days
  days61To90: string;   // 61 - 90 days
  over90Days: string;   // > 90 days
  total: string;
  invoiceCount: number;
}

export interface VendorAgingSummary {
  vendorId: string;
  vendorName: string;
  current: string;
  days31To60: string;
  days61To90: string;
  over90Days: string;
  total: string;
  invoiceCount: number;
}

// ==================== ENTERPRISE SYSTEM & SETTINGS TYPES ====================
export interface UserGroup {
  id: string;
  name: string;
  code: string;
  description: string;
  organizationalUnit: string; // e.g. "Finance & Treasury", "Human Resources", "Field Operations"
  memberCount: number;
  isSystemDefault?: boolean;
  policies: {
    viewGeneralLedger: boolean;
    postManualJournals: boolean;
    approveSupplierBills: boolean;
    viewFinancialReports: boolean;
    manageEmployees: boolean;
    approveLeaveRequests: boolean;
    runPayroll: boolean;
    submitExpenseReceipts: boolean;
    approveExpenseClaims: boolean;
    manageInfrastructureAdapters: boolean;
    viewSecurityAuditLedger: boolean;
  };
}

export interface SystemBrandSettings {
  systemName: string;
  enterpriseDescription: string;
  brandAccentColor: string;
  masterLogoUrl?: string;
  organizationName: string;
}

export interface UserAccountProfile {
  id: string;
  fullName: string;
  workEmail: string;
  role: UserRole;
  department: string;
  timezone: string;
  avatarUrl: string;
  phone?: string;
  notifications: {
    emailDigests: boolean;
    realtimePush: boolean;
    glJournalAlerts: boolean;
    payrollRunApproval: boolean;
    highValueExpenseAlert: boolean;
  };
}


