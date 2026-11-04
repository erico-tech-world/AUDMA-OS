/**
 * AUDMA OS Production API Client
 * Wraps fetch with automatic session cookie handling, auth headers,
 * and standardized error responses.
 */

const API_BASE = (typeof window !== 'undefined' && window.location)
  ? window.location.origin
  : process.env.APP_URL || 'http://localhost:3000';

export interface ApiError {
  code: string;
  error: string;
}

/**
 * Internal fetch wrapper. Automatically includes cookies (session)
 * and parses JSON responses. Throws on non-ok responses.
 */
async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<any> {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // send session cookies
  });

  if (!res.ok) {
    let errorBody: ApiError = { code: 'HTTP_ERROR', error: `Request failed (${res.status})` };
    try {
      errorBody = await res.json();
    } catch {
      // use default
    }
    throw new ApiClientError(errorBody.code, errorBody.error, res.status);
  }

  // Handle 204 No Content
  if (res.status === 204) return null;

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return res.json();
  }
  return res.text();
}

export class ApiClientError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

/**
 * GET helper
 */
export async function apiGet(path: string): Promise<any> {
  return apiFetch(path, { method: 'GET' });
}

/**
 * POST helper
 */
export async function apiPost(path: string, body?: any): Promise<any> {
  return apiFetch(path, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * PATCH helper
 */
export async function apiPatch(path: string, body?: any): Promise<any> {
  return apiFetch(path, {
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * DELETE helper
 */
export async function apiDelete(path: string): Promise<any> {
  return apiFetch(path, { method: 'DELETE' });
}

/**
 * Auth API
 */
export const authApi = {
  login: (email: string, password: string) =>
    apiPost('/api/auth/login', { email, password }),
  logout: () => apiPost('/api/auth/logout'),
  me: () => apiGet('/api/auth/me'),
  register: (data: { email: string; password: string; full_name: string; role?: string }) =>
    apiPost('/api/auth/register', data),
  changePassword: (currentPassword: string, newPassword: string) =>
    apiPost('/api/auth/change-password', { current_password: currentPassword, new_password: newPassword }),
};

/**
 * Accounting API
 */
export const accountingApi = {
  listAccounts: () => apiGet('/api/accounting/accounts'),
  createAccount: (data: any) => apiPost('/api/accounting/accounts', data),
  listJournals: () => apiGet('/api/accounting/journals'),
  createJournal: (data: any) => apiPost('/api/accounting/journals', data),
  getJournal: (id: string) => apiGet(`/api/accounting/journals/${id}`),
  listVendors: () => apiGet('/api/accounting/vendors'),
  createVendor: (data: any) => apiPost('/api/accounting/vendors', data),
  listInvoices: (status?: string) =>
    apiGet(`/api/accounting/invoices${status ? `?status=${encodeURIComponent(status)}` : ''}`),
  createInvoice: (data: any) => apiPost('/api/accounting/invoices', data),
  updateInvoiceStatus: (id: string, data: { status: string; journal_entry_id?: string }) =>
    apiPatch(`/api/accounting/invoices/${id}/status`, data),
  trialBalance: () => apiGet('/api/accounting/reports/trial-balance'),
  apAging: (asOf?: string) =>
    apiGet(`/api/accounting/reports/ap-aging${asOf ? `?asOf=${encodeURIComponent(asOf)}` : ''}`),
};

/**
 * HRM API
 */
export const hrmApi = {
  listDepartments: () => apiGet('/api/hrm/departments'),
  createDepartment: (data: any) => apiPost('/api/hrm/departments', data),
  listEmployees: () => apiGet('/api/hrm/employees'),
  createEmployee: (data: any) => apiPost('/api/hrm/employees', data),
  updateEmployee: (id: string, data: any) => apiPatch(`/api/hrm/employees/${id}`, data),
  deleteEmployee: (id: string) => apiDelete(`/api/hrm/employees/${id}`),
  listAttendance: () => apiGet('/api/hrm/attendance'),
  recordAttendance: (data: any) => apiPost('/api/hrm/attendance', data),
  listLeave: () => apiGet('/api/hrm/leave'),
  createLeave: (data: any) => apiPost('/api/hrm/leave', data),
  updateLeaveStatus: (id: string, data: { status: string; reviewed_by: string }) =>
    apiPatch(`/api/hrm/leave/${id}/status`, data),
  createPayrollRun: (data: any) => apiPost('/api/hrm/payroll/runs', data),
  createPayrollRecord: (data: any) => apiPost('/api/hrm/payroll/records', data),
  listPayrollRecords: (runId: string) => apiGet(`/api/hrm/payroll/runs/${runId}/records`),
};

/**
 * Receipts API
 */
export const receiptsApi = {
  listReceipts: () => apiGet('/api/receipts'),
  createReceipt: (data: any) => apiPost('/api/receipts', data),
  updateReceiptStatus: (id: string, data: { status: string; reviewer_user_id?: string; journal_entry_id?: string; rejection_reason?: string }) =>
    apiPatch(`/api/receipts/${id}/status`, data),
  getSummary: () => apiGet('/api/receipts/summary'),
};

/**
 * Users & Audit API
 */
export const adminApi = {
  listUsers: () => apiGet('/api/auth/users'),
  listAuditLogs: () => apiGet('/api/audit/logs'),
};
