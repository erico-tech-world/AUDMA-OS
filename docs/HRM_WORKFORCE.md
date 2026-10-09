# AUDMA OS - Workforce & Human Resource Management (HRM) Specification

## 1. Overview & Architectural Scope

The HRM module in AUDMA OS orchestrates the entire human capital management lifecycle:
- **Employee Directory**: Profile maintenance, departmental assignments, salary tiers, and employment status.
- **Organizational Departments**: Department heads, budgetary allocations, and team headcount metrics.
- **Attendance & Time Tracking**: Virtual punch clocks with geolocation, IP address recording, overtime computation, and duplicate clock-in guardrails.
- **Leave & Absence Administration**: Multi-type requests (Annual, Sick, Parental, Unpaid, Remote), quota tracking, and multi-tier manager approvals.
- **Statutory Payroll Engine**: Multi-tiered payroll processing with automated tax, pension, and net salary calculations, integrated with the General Ledger via domain events.

---

## 2. Employee & Department Management

### 2.1 Employee Data Model
Employees are modeled with strict domain validation:

```typescript
export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  departmentId: string;
  role: string;
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN';
  status: 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED' | 'PROBATION';
  baseSalaryMonthly: string; // Managed via Decimal.js representation
  hireDate: string;
  emergencyContact?: string;
  avatarUrl?: string;
}
```

### 2.2 Department Organization
Departments serve as the reporting foundation for expense tracking and team oversight:
- **Engineering & Product**
- **Finance & Accounting**
- **Sales & Commercial**
- **Operations & Logistics**
- **Human Resources & Talent**

Each department maintains:
- `managerId`: The user ID of the Department Head.
- `budget`: Monthly operational budget (tracked against salary and expense claims).
- `headcount`: Automatically derived from active employees assigned to the department.

---

## 3. Time & Attendance Engine

### 3.1 Attendance Record Model
```typescript
export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  clockInTime: string; // ISO 8601 Timestamp
  clockOutTime?: string; // ISO 8601 Timestamp
  totalHoursWorked: string; // Decimal string (e.g. "8.50")
  status: 'PRESENT' | 'LATE' | 'HALF_DAY' | 'ABSENT' | 'OVERTIME';
  ipAddress?: string;
  geoCoordinates?: {
    latitude: number;
    longitude: number;
  };
  notes?: string;
}
```

### 3.2 Duplicate Clock-in Guardrail
To ensure data integrity, the attendance engine enforces an invariant:
```typescript
// An employee can only have one open clock-in per calendar day
const existingToday = records.find(
  r => r.employeeId === employeeId && r.date === today && !r.clockOutTime
);
if (existingToday) {
  throw new Error("Employee already has an active clock-in session for today.");
}
```

### 3.3 Overtime Calculation Heuristic
Standard working day is calibrated to 8.00 hours:
- $Hours \le 8.00$: Standard working time (`PRESENT`).
- $Hours > 8.00$: Excess is flagged as overtime (`OVERTIME`).
- Arrival after designated policy time (e.g. 09:30 AM) automatically tags the record as `LATE`.

---

## 4. Leave & Absence Administration

### 4.1 Leave Types & Entitlements
1. **Annual Leave (Vacation)**: Standard accrued annual allotment.
2. **Sick Leave**: Health-related absences requiring physician clearance if over 3 consecutive days.
3. **Parental Leave**: Maternity / Paternity statutory allowances.
4. **Remote Working (WFH)**: Remote work status without deducting from paid time off.
5. **Unpaid Leave**: Personal leave without salary accrual.

### 4.2 Leave Request Lifecycle
```
[Staff submits leave request]
             │
             ▼
      State: PENDING
             │
      ┌──────┴──────┐
      ▼             ▼
  [Approve]     [Reject]
      │             │
      ▼             ▼
State: APPROVED  State: REJECTED
```
- Only users with `hrm:approve_leave` permission (`SUPER_ADMIN`, `HR_DIRECTOR`, or designated `DEPARTMENT_HEAD`) can approve requests.

---

## 5. Statutory Payroll Engine & Cross-Domain Event Integration

### 5.1 Mathematical Deduction Model
All figures are computed with `Decimal.js` to eliminate rounding errors:

$$\text{Gross Salary} = \sum \text{Employee Base Salaries}$$
$$\text{Tax Withholding} = \text{Gross Salary} \times 15\% \quad (\text{Statutory Income Tax})$$
$$\text{Pension Contribution} = \text{Gross Salary} \times 8\% \quad (\text{Retirement Contribution})$$
$$\text{Net Pay} = \text{Gross Salary} - (\text{Tax Withholding} + \text{Pension Contribution})$$

### 5.2 Decoupled Payroll Dispatch
When an HR Director or Super Admin executes **Finalize & Disburse Payroll**, the HRM engine dispatches an event via the `eventBus`:

```typescript
await eventBus.publish('hrm.payroll.finalized', {
  periodId: 'PAY-2026-10',
  periodName: 'October 2026 Standard Payroll',
  totalGross: '45000.00',
  totalNet: '34650.00',
  totalTax: '6750.00',
  totalPension: '3600.00',
  finalizedBy: 'Sarah Jenkins (HR Director)',
  timestamp: new Date().toISOString(),
});
```

The Accounting General Ledger listener receives this message and posts a balanced journal entry, linking human capital expenditures to the general ledger without direct coupling between the modules.
