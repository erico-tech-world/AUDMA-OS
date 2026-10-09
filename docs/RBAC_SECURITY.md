# AUDMA OS - Role-Based Access Control (RBAC) & Security Specification

## 1. Security Architecture & Threat Model

Enterprise systems processing general ledgers, payroll records, and sensitive receipts require strict separation of concerns, principle of least privilege, and immutable audit trails.

AUDMA OS incorporates:
- **Hierarchical Role-Based Access Control (RBAC)**: 6 defined enterprise roles mapping to 13 granular operational permissions.
- **Client & Server Access Enforcement**: UI controls conditionally render based on verified user permissions, and API endpoints enforce domain rules.
- **Immutable Audit Logging**: Every critical domain action (journal posting, invoice approval, payroll run, leave request change, role mutation) creates an immutable audit record.
- **Session Simulation**: Super Admins can simulate other user accounts directly within the UI to test permission boundaries.

---

## 2. Granular Permissions & Role Matrix

### 2.1 Granular Permissions (`GranularPermission`)
```typescript
export type GranularPermission =
  | 'accounting:view'             // Read-only access to Chart of Accounts, Journals & Reports
  | 'accounting:post_journal'     // Create and post manual double-entry journal entries
  | 'accounting:approve_invoice'  // Approve accounts payable vendor bills
  | 'accounting:view_reports'     // Access Balance Sheet, P&L, Trial Balance, Aging Schedules
  | 'hrm:view'                    // View employee directory and department lists
  | 'hrm:manage_employees'        // Create, update, or terminate employee records
  | 'hrm:approve_leave'           // Approve or reject employee leave requests
  | 'hrm:run_payroll'             // Finalize and disburse statutory payroll runs
  | 'receipts:view'               // View daily expense hub receipts
  | 'receipts:submit'             // Upload personal receipts and submit claims
  | 'receipts:approve'            // Audit, approve, or reject employee expense claims
  | 'admin:providers'             // Modify cloud database, storage, queue & AI providers
  | 'admin:audit_logs';           // View system security logs and user activity history
```

### 2.2 Role-to-Permission Matrix

| Permission | `SUPER_ADMIN` | `FINANCIAL_CONTROLLER` | `HR_DIRECTOR` | `DEPARTMENT_HEAD` | `SENIOR_ACCOUNTANT` | `STAFF_EMPLOYEE` |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `accounting:view` | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| `accounting:post_journal` | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| `accounting:approve_invoice` | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| `accounting:view_reports` | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| `hrm:view` | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| `hrm:manage_employees` | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `hrm:approve_leave` | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| `hrm:run_payroll` | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `receipts:view` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `receipts:submit` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `receipts:approve` | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| `admin:providers` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `admin:audit_logs` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## 3. RBAC Enforcement in Code (`src/domains/core/rbac.ts`)

### 3.1 Permission Checking Method
The `coreAuthService` provides deterministic authorization checks:

```typescript
public hasPermission(permission: GranularPermission): boolean {
  const user = this.getCurrentUser();
  if (user.role === 'SUPER_ADMIN') return true;
  return user.permissions.includes(permission);
}
```

### 3.2 UI Component Protection
Views and interactive controls check permissions before rendering:
```tsx
{coreAuthService.hasPermission('hrm:run_payroll') && (
  <button onClick={handleRunPayroll} className="btn-primary">
    Finalize & Disburse Payroll
  </button>
)}
```

---

## 4. Immutable Audit Trail System

Every security-sensitive operation in AUDMA OS invokes `coreAuthService.logAction`:

```typescript
export interface AuditLog {
  id: string;
  timestamp: string;      // ISO 8601 UTC timestamp
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;        // e.g. "POST_JOURNAL_ENTRY", "FINALIZE_PAYROLL", "APPROVE_INVOICE"
  module: 'ACCOUNTING' | 'HRM' | 'RECEIPTS' | 'PROVIDERS' | 'SYSTEM' | 'SECURITY';
  details: string;       // Human-readable summary of the mutation
  ipAddress?: string;
  userAgent?: string;
}
```

### Properties of the Audit Trail:
1. **Append-Only**: Audit records cannot be modified or deleted via UI or standard business methods.
2. **Sequential Traceability**: Each log record receives an auto-incrementing identifier (`LOG-XXXX`).
3. **Cross-Domain Tracking**: Audits include background events (e.g. `AUDMA Event Worker` processing asynchronous ledger postings).
4. **Accessible to Authorized Roles**: Only users with `admin:audit_logs` (`SUPER_ADMIN`, `FINANCIAL_CONTROLLER`, and `HR_DIRECTOR`) can inspect the audit ledger.

---

## 5. Security Best Practices & Hardening

1. **Client-Side Secret Shielding**:
   - `GEMINI_API_KEY` and other provider credentials are never passed down to the browser.
   - All AI, OCR, and external API requests route through the server proxy (`/api/*`), ensuring zero credential exposure in client network inspect panels.
2. **Input Sanitization & Injection Prevention**:
   - Numeric inputs are sanitized and converted to Decimal instances before ledger calculation.
   - Prompts for LLM invoice extraction use isolated system instructions with schema validation to prevent prompt injection.
3. **WCAG AA Compliance**:
   - High-contrast visual tokens for alert dialogs and error states.
   - Focus management on modals with `Escape` key listeners to prevent keyboard trapping.
