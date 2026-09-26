import {
  Employee,
  AttendanceRecord,
  LeaveRequest,
  PayrollPeriod,
  PayrollRecord,
  Department,
  AttendanceConfig,
} from '../../types';
import { toDecimal, calcPercentage } from '../../lib/math';
import { coreAuthService } from '../core/rbac';
import { eventBus } from '../events/event-bus';

export const INITIAL_DEPARTMENTS: Department[] = [
  {
    id: 'dept-fin',
    code: 'FIN',
    name: 'Finance & Treasury',
    description: 'Corporate accounting, General Ledger bookkeeping, statutory reporting, accounts payable, and liquidity control.',
    headOfDepartmentId: 'emp-101',
    headOfDepartmentName: 'Marcus Sterling',
    headOfDepartmentEmail: 'm.sterling@audma.enterprise',
    budgetAnnual: '1250000.00',
    employeeCount: 2,
    approvalPrivileges: ['leave_approval', 'expense_review', 'gl_posting_signoff'],
    createdAt: '2023-01-15T08:00:00.000Z',
  },
  {
    id: 'dept-hr',
    code: 'HR',
    name: 'Human Resources & People Ops',
    description: 'Workforce management, talent acquisition, payroll calculation, employee relations, and policy compliance.',
    headOfDepartmentId: 'emp-102',
    headOfDepartmentName: 'Amara Chen',
    headOfDepartmentEmail: 'amara.chen@audma.enterprise',
    budgetAnnual: '850000.00',
    employeeCount: 1,
    approvalPrivileges: ['leave_approval', 'payroll_signoff', 'workforce_planning'],
    createdAt: '2023-01-15T08:00:00.000Z',
  },
  {
    id: 'dept-eng',
    code: 'ENG',
    name: 'Software Engineering & Cloud',
    description: 'Decoupled modular monolith architecture, cloud infrastructure, AI model pipelines, and system reliability.',
    headOfDepartmentId: 'emp-103',
    headOfDepartmentName: 'Tariq Al-Mansoor',
    headOfDepartmentEmail: 'tariq.m@audma.enterprise',
    budgetAnnual: '2400000.00',
    employeeCount: 2,
    approvalPrivileges: ['leave_approval', 'expense_review', 'infrastructure_budget'],
    createdAt: '2023-01-15T08:00:00.000Z',
  },
  {
    id: 'dept-ops',
    code: 'OPS',
    name: 'Global Operations & Logistics',
    description: 'Enterprise resource distribution, field supply chain, multi-vendor procurement, and operational excellence.',
    headOfDepartmentId: 'emp-104',
    headOfDepartmentName: "Siobhan O'Connor",
    headOfDepartmentEmail: 'siobhan.o@audma.enterprise',
    budgetAnnual: '1600000.00',
    employeeCount: 1,
    approvalPrivileges: ['leave_approval', 'expense_review', 'vendor_po_approval', 'shift_signoff'],
    createdAt: '2023-01-15T08:00:00.000Z',
  },
];

export const STANDARD_HOD_PRIVILEGES = [
  { id: 'vendor_po_approval', label: 'Vendor PO Approval', description: 'Authorize vendor contracts & purchase orders' },
  { id: 'infrastructure_budget', label: 'Infrastructure Budget', description: 'Allocate cloud compute & infra expenditures' },
  { id: 'payroll_signoff', label: 'Payroll Sign-off', description: 'Review & approve departmental payroll periods' },
  { id: 'workforce_planning', label: 'Workforce Planning', description: 'Headcount requisition & compensation plans' },
  { id: 'gl_posting_signoff', label: 'GL Posting Sign-off', description: 'Sign-off on journal vouchers affecting department' },
  { id: 'leave_approval', label: 'Leave Approval', description: 'Approve or decline staff time-off and PTO requests' },
  { id: 'expense_review', label: 'Expense Review', description: 'Verify employee expense receipts & reimbursements' },
  { id: 'shift_signoff', label: 'Shift Sign-off', description: 'Approve overtime hours and custom shift rosters' },
] as const;

export const DEFAULT_ATTENDANCE_CONFIG: AttendanceConfig = {
  workStartTime: '09:00',
  workEndTime: '17:00',
  lunchBreakMinutes: 60,
  standardDailyHours: 7,
  standardDailyDurationFormatted: '07:00:00',
  lateGraceMinutes: 15,
  overtimeMultiplier: '1.5',
  overtimeThresholdHours: 8,
  defaultShift: 'Standard Day Shift (09:00 - 17:00)',
  biometricSyncIntervalMinutes: 30,
  customLoggingTemplate: 'Enterprise Monolith Shift Log v2.4',
  autoDeductLunchBreak: true,
  requireGeoLocation: false,
  officeLatitude: 37.7749,
  officeLongitude: -122.4194,
  allowedGeoRadiusMeters: 500,
  officeLocationName: 'AUDMA Global HQ • 100 Innovation Way',
};

export interface ShiftDurationResult {
  totalSeconds: number;
  grossSeconds: number;
  lunchSeconds: number;
  netSeconds: number;
  hours: number;
  minutes: number;
  seconds: number;
  formattedHHMMSS: string;
  formattedHuman: string;
  decimalHours: number;
  decimalHoursStr: string;
}

/**
 * Exact time arithmetic following the standard 60SEC:60MIN:24HRS rule
 */
export function calculateExactShiftDuration(
  startTimeStr: string,
  endTimeStr: string,
  lunchBreakMinutes: number = 60,
  autoDeductLunch: boolean = true
): ShiftDurationResult {
  const parseTimeToSeconds = (tStr: string): number => {
    if (!tStr) return 0;
    const match = tStr.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*([AP]M))?$/i);
    if (!match) return 0;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const seconds = match[3] ? parseInt(match[3], 10) : 0;
    const meridian = match[4]?.toUpperCase();
    if (meridian === 'PM' && hours < 12) hours += 12;
    if (meridian === 'AM' && hours === 12) hours = 0;
    // 60SEC:60MIN:24HRS standard arithmetic
    return (hours % 24) * 3600 + (minutes % 60) * 60 + (seconds % 60);
  };

  const startSecs = parseTimeToSeconds(startTimeStr);
  let endSecs = parseTimeToSeconds(endTimeStr);

  if (endSecs < startSecs) {
    // Overnight shift crossing midnight
    endSecs += 24 * 3600;
  }

  const grossSeconds = Math.max(0, endSecs - startSecs);
  const lunchSeconds = autoDeductLunch ? Math.max(0, (lunchBreakMinutes || 0) * 60) : 0;
  const netSeconds = Math.max(0, grossSeconds - lunchSeconds);

  const hours = Math.floor(netSeconds / 3600);
  const remainingSecs = netSeconds % 3600;
  const minutes = Math.floor(remainingSecs / 60);
  const seconds = remainingSecs % 60;

  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  const decimalHours = Number((netSeconds / 3600).toFixed(2));
  const decimalHoursStr = (netSeconds / 3600).toFixed(2);

  return {
    totalSeconds: netSeconds,
    grossSeconds,
    lunchSeconds,
    netSeconds,
    hours,
    minutes,
    seconds,
    formattedHHMMSS: `${hh}:${mm}:${ss}`,
    formattedHuman: `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`,
    decimalHours,
    decimalHoursStr,
  };
}

/**
 * Precise Haversine distance calculator for Geo-Fencing perimeter validation
 */
export function calculateHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaPhi = toRad(lat2 - lat1);
  const deltaLambda = toRad(lon2 - lon1);

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: 'emp-101',
    employeeCode: 'AUD-001',
    firstName: 'Marcus',
    lastName: 'Sterling',
    email: 'm.sterling@audma.enterprise',
    phone: '+1 (555) 234-9812',
    department: 'Finance',
    jobTitle: 'VP of Financial Control',
    status: 'ACTIVE',
    hireDate: '2023-03-15',
    baseSalaryMonthly: '14500.00',
    allowances: '1200.00',
    taxDeductionRate: '22',
    pensionRate: '6',
    bankAccount: 'US-CHASE-99201948',
  },
  {
    id: 'emp-102',
    employeeCode: 'AUD-002',
    firstName: 'Amara',
    lastName: 'Chen',
    email: 'amara.chen@audma.enterprise',
    phone: '+1 (555) 782-4410',
    department: 'Human Resources',
    jobTitle: 'Chief People Officer',
    status: 'ACTIVE',
    hireDate: '2023-04-01',
    baseSalaryMonthly: '13800.00',
    allowances: '1000.00',
    taxDeductionRate: '20',
    pensionRate: '5',
    bankAccount: 'US-WELLS-33019284',
  },
  {
    id: 'emp-103',
    employeeCode: 'AUD-003',
    firstName: 'Tariq',
    lastName: 'Al-Mansoor',
    email: 'tariq.m@audma.enterprise',
    phone: '+1 (555) 912-3381',
    department: 'Engineering',
    jobTitle: 'Principal Distributed Systems Architect',
    status: 'ACTIVE',
    hireDate: '2023-06-12',
    baseSalaryMonthly: '16200.00',
    allowances: '1500.00',
    taxDeductionRate: '24',
    pensionRate: '6',
    bankAccount: 'US-CITI-88192039',
  },
  {
    id: 'emp-104',
    employeeCode: 'AUD-004',
    firstName: 'Siobhan',
    lastName: 'O\'Connor',
    email: 'siobhan.o@audma.enterprise',
    phone: '+1 (555) 441-2903',
    department: 'Operations',
    jobTitle: 'Director of Global Operations',
    status: 'ACTIVE',
    hireDate: '2024-01-10',
    baseSalaryMonthly: '11500.00',
    allowances: '800.00',
    taxDeductionRate: '18',
    pensionRate: '5',
    bankAccount: 'US-BOA-55910293',
  },
  {
    id: 'emp-105',
    employeeCode: 'AUD-005',
    firstName: 'Devon',
    lastName: 'Hayes',
    email: 'devon.h@audma.enterprise',
    phone: '+1 (555) 671-8842',
    department: 'Finance',
    jobTitle: 'Senior General Ledger Accountant',
    status: 'ACTIVE',
    hireDate: '2024-05-20',
    baseSalaryMonthly: '8900.00',
    allowances: '600.00',
    taxDeductionRate: '16',
    pensionRate: '5',
    bankAccount: 'US-CHASE-11928374',
  },
  {
    id: 'emp-106',
    employeeCode: 'AUD-006',
    firstName: 'Kavita',
    lastName: 'Patel',
    email: 'kavita.p@audma.enterprise',
    phone: '+1 (555) 338-1904',
    department: 'Engineering',
    jobTitle: 'Senior Full-Stack Cloud Engineer',
    status: 'ACTIVE',
    hireDate: '2024-07-01',
    baseSalaryMonthly: '11900.00',
    allowances: '900.00',
    taxDeductionRate: '20',
    pensionRate: '5',
    bankAccount: 'US-PNC-77291039',
  },
];

export const INITIAL_ATTENDANCE: AttendanceRecord[] = [
  {
    id: 'att-1',
    employeeId: 'emp-101',
    employeeName: 'Marcus Sterling',
    date: '2026-09-19',
    clockInTime: '08:45 AM',
    clockOutTime: '05:30 PM',
    hoursWorked: '8.75',
    status: 'PRESENT',
  },
  {
    id: 'att-2',
    employeeId: 'emp-102',
    employeeName: 'Amara Chen',
    date: '2026-09-19',
    clockInTime: '09:02 AM',
    clockOutTime: '06:10 PM',
    hoursWorked: '8.13',
    status: 'PRESENT',
  },
  {
    id: 'att-3',
    employeeId: 'emp-103',
    employeeName: 'Tariq Al-Mansoor',
    date: '2026-09-19',
    clockInTime: '09:30 AM',
    hoursWorked: '7.50',
    status: 'LATE',
  },
  {
    id: 'att-4',
    employeeId: 'emp-104',
    employeeName: 'Siobhan O\'Connor',
    date: '2026-09-19',
    clockInTime: '08:30 AM',
    clockOutTime: '05:00 PM',
    hoursWorked: '8.50',
    status: 'PRESENT',
  },
  {
    id: 'att-5',
    employeeId: 'emp-105',
    employeeName: 'Devon Hayes',
    date: '2026-09-19',
    clockInTime: '08:50 AM',
    hoursWorked: '8.00',
    status: 'PRESENT',
  },
];

export const INITIAL_LEAVE_REQUESTS: LeaveRequest[] = [
  {
    id: 'lev-1',
    employeeId: 'emp-106',
    employeeName: 'Kavita Patel',
    leaveType: 'ANNUAL',
    startDate: '2026-09-24',
    endDate: '2026-09-28',
    totalDays: 4,
    reason: 'Family wedding abroad',
    status: 'PENDING',
  },
  {
    id: 'lev-2',
    employeeId: 'emp-104',
    employeeName: 'Siobhan O\'Connor',
    leaveType: 'SICK',
    startDate: '2026-09-15',
    endDate: '2026-09-16',
    totalDays: 2,
    reason: 'Post-operative recovery',
    status: 'APPROVED',
    approvedBy: 'Amara Chen',
  },
];

class HRMEngine {
  private employees: Employee[] = [...INITIAL_EMPLOYEES];
  private attendance: AttendanceRecord[] = [...INITIAL_ATTENDANCE];
  private leaveRequests: LeaveRequest[] = [...INITIAL_LEAVE_REQUESTS];
  private departments: Department[] = [...INITIAL_DEPARTMENTS];
  private attendanceConfig: AttendanceConfig = { ...DEFAULT_ATTENDANCE_CONFIG };
  private payrollPeriods: PayrollPeriod[] = [];

  constructor() {
    this.initCurrentPayrollPeriod();
  }

  private initCurrentPayrollPeriod() {
    const records = this.calculatePayrollRecords('pay-sep-2026');
    const totalGross = records.reduce((acc, r) => acc.plus(toDecimal(r.grossSalary)), toDecimal(0));
    const totalDeductions = records.reduce((acc, r) => acc.plus(toDecimal(r.totalDeductions)), toDecimal(0));
    const totalNet = records.reduce((acc, r) => acc.plus(toDecimal(r.netSalary)), toDecimal(0));

    this.payrollPeriods = [
      {
        id: 'pay-sep-2026',
        periodName: 'September 2026 (Monthly Cycle)',
        startDate: '2026-09-01',
        endDate: '2026-09-30',
        status: 'OPEN',
        totalGross: totalGross.toFixed(2),
        totalDeductions: totalDeductions.toFixed(2),
        totalNet: totalNet.toFixed(2),
        employeeCount: records.length,
        records,
      },
    ];
  }

  getEmployees(): Employee[] {
    return [...this.employees];
  }

  getAttendance(): AttendanceRecord[] {
    return [...this.attendance];
  }

  getLeaveRequests(): LeaveRequest[] {
    return [...this.leaveRequests];
  }

  getPayrollPeriods(): PayrollPeriod[] {
    return [...this.payrollPeriods];
  }

  getAttendanceConfig(): AttendanceConfig {
    return { ...this.attendanceConfig };
  }

  updateAttendanceConfig(config: Partial<AttendanceConfig>): AttendanceConfig {
    this.attendanceConfig = {
      ...this.attendanceConfig,
      ...config,
    };
    coreAuthService.logAction(
      coreAuthService.getCurrentUser().name,
      'UPDATE_ATTENDANCE_CONFIG',
      'HRM',
      `Updated shift hours (${this.attendanceConfig.workStartTime}-${this.attendanceConfig.workEndTime}) & grace period (${this.attendanceConfig.lateGraceMinutes}m)`
    );
    return { ...this.attendanceConfig };
  }

  getDepartments(): Department[] {
    // Dynamically update employee counts per department
    return this.departments.map((dept) => {
      const count = this.employees.filter((e) => e.department === dept.name || e.department.includes(dept.code)).length;
      return {
        ...dept,
        employeeCount: count > 0 ? count : dept.employeeCount,
      };
    });
  }

  createDepartment(data: Omit<Department, 'id' | 'createdAt'>): Department {
    const newDept: Department = {
      ...data,
      id: `dept-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    this.departments.push(newDept);
    coreAuthService.logAction(
      coreAuthService.getCurrentUser().name,
      'CREATE_DEPARTMENT',
      'HRM',
      `Created department ${newDept.name} (HOD: ${newDept.headOfDepartmentName})`
    );
    return newDept;
  }

  updateDepartment(id: string, data: Partial<Department>): Department {
    const idx = this.departments.findIndex((d) => d.id === id);
    if (idx === -1) throw new Error('Department not found');

    this.departments[idx] = {
      ...this.departments[idx],
      ...data,
    };
    coreAuthService.logAction(
      coreAuthService.getCurrentUser().name,
      'UPDATE_DEPARTMENT',
      'HRM',
      `Updated department ${this.departments[idx].name} details and HOD`
    );
    return { ...this.departments[idx] };
  }

  deleteDepartment(id: string): void {
    const dept = this.departments.find((d) => d.id === id);
    if (!dept) throw new Error('Department not found');

    this.departments = this.departments.filter((d) => d.id !== id);
    coreAuthService.logAction(
      coreAuthService.getCurrentUser().name,
      'DELETE_DEPARTMENT',
      'HRM',
      `Removed department ${dept.name} (${dept.code})`
    );
  }

  addEmployee(empData: Omit<Employee, 'id' | 'employeeCode'>): Employee {
    const newEmp: Employee = {
      ...empData,
      id: `emp-${Date.now()}`,
      employeeCode: `AUD-${String(this.employees.length + 1).padStart(3, '0')}`,
    };
    this.employees.push(newEmp);
    coreAuthService.logAction(
      coreAuthService.getCurrentUser().name,
      'CREATE_EMPLOYEE',
      'HRM',
      `Registered employee ${newEmp.firstName} ${newEmp.lastName} (${newEmp.department})`
    );
    return newEmp;
  }

  updateEmployee(id: string, data: Partial<Employee>): Employee {
    const idx = this.employees.findIndex((e) => e.id === id);
    if (idx === -1) throw new Error('Employee not found');

    this.employees[idx] = {
      ...this.employees[idx],
      ...data,
    };

    coreAuthService.logAction(
      coreAuthService.getCurrentUser().name,
      'UPDATE_EMPLOYEE',
      'HRM',
      `Updated employee profile: ${this.employees[idx].firstName} ${this.employees[idx].lastName} (${this.employees[idx].jobTitle})`
    );
    return { ...this.employees[idx] };
  }

  deleteEmployee(id: string): void {
    const emp = this.employees.find((e) => e.id === id);
    if (!emp) throw new Error('Employee not found');

    this.employees = this.employees.filter((e) => e.id !== id);
    coreAuthService.logAction(
      coreAuthService.getCurrentUser().name,
      'DELETE_EMPLOYEE',
      'HRM',
      `Terminated/De-registered employee: ${emp.firstName} ${emp.lastName} (${emp.employeeCode})`
    );
  }

  /**
   * Dynamically calculate net worked hours derived from user-configured shift parameters
   * following the standard 60SEC:60MIN:24HRS rule
   */
  calculateNetWorkedHours(
    clockInTime?: string,
    clockOutTime?: string,
    customLunchMinutes?: number
  ): string {
    const startStr = clockInTime || this.attendanceConfig.workStartTime;
    const endStr = clockOutTime || this.attendanceConfig.workEndTime;
    const lunchMins = customLunchMinutes ?? this.attendanceConfig.lunchBreakMinutes ?? 60;
    const autoDeduct = this.attendanceConfig.autoDeductLunchBreak;

    const result = calculateExactShiftDuration(startStr, endStr, lunchMins, autoDeduct);
    if (result.netSeconds <= 0) {
      return '00:00:00';
    }
    return result.formattedHHMMSS;
  }

  /**
   * Return complete shift duration metadata including formatted HH:MM:SS and Xh Ym Zs
   */
  getShiftDurationMeta(
    clockInTime?: string,
    clockOutTime?: string,
    customLunchMinutes?: number
  ): ShiftDurationResult {
    const startStr = clockInTime || this.attendanceConfig.workStartTime;
    const endStr = clockOutTime || this.attendanceConfig.workEndTime;
    const lunchMins = customLunchMinutes ?? this.attendanceConfig.lunchBreakMinutes ?? 60;
    const autoDeduct = this.attendanceConfig.autoDeductLunchBreak;

    return calculateExactShiftDuration(startStr, endStr, lunchMins, autoDeduct);
  }

  /**
   * Real-time Geo-Fencing perimeter check against defined office coordinates
   */
  verifyGeoLocation(userLat: number, userLon: number): {
    isWithinPerimeter: boolean;
    distanceMeters: number;
    allowedRadiusMeters: number;
    officeLocationName: string;
    officeLat: number;
    officeLon: number;
  } {
    const officeLat = this.attendanceConfig.officeLatitude ?? 37.7749;
    const officeLon = this.attendanceConfig.officeLongitude ?? -122.4194;
    const allowedRadiusMeters = this.attendanceConfig.allowedGeoRadiusMeters ?? 500;
    const officeLocationName = this.attendanceConfig.officeLocationName ?? 'AUDMA Global HQ • 100 Innovation Way';

    const distanceMeters = calculateHaversineDistanceMeters(userLat, userLon, officeLat, officeLon);
    const isWithinPerimeter = distanceMeters <= allowedRadiusMeters;

    return {
      isWithinPerimeter,
      distanceMeters,
      allowedRadiusMeters,
      officeLocationName,
      officeLat,
      officeLon,
    };
  }

  recordManualAttendance(data: {
    employeeId: string;
    date: string;
    clockInTime: string;
    clockOutTime?: string;
    hoursWorked?: string;
    status?: 'PRESENT' | 'LATE' | 'HALF_DAY' | 'ABSENT';
  }): { record: AttendanceRecord; warning?: string } {
    const emp = this.employees.find((e) => e.id === data.employeeId);
    if (!emp) throw new Error('Employee not found');

    // Smart duplicate detection: cross check against existing biometric or manual records
    const existing = this.attendance.find(
      (a) => a.employeeId === data.employeeId && a.date === data.date
    );

    let warning: string | undefined;
    if (existing) {
      warning = `Existing clock-in recorded for ${emp.firstName} on ${data.date} (at ${existing.clockInTime}). Entry updated.`;
    }

    // Dynamic derivation of hoursWorked based on user shift params if not explicitly overridden
    const derivedHours =
      data.hoursWorked && !isNaN(parseFloat(data.hoursWorked))
        ? parseFloat(data.hoursWorked).toFixed(2)
        : this.calculateNetWorkedHours(data.clockInTime, data.clockOutTime);

    const record: AttendanceRecord = {
      id: existing ? existing.id : `att-${Date.now()}`,
      employeeId: emp.id,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      date: data.date,
      clockInTime: data.clockInTime,
      clockOutTime: data.clockOutTime || '05:00 PM',
      hoursWorked: derivedHours,
      status: data.status || 'PRESENT',
    };

    if (existing) {
      const idx = this.attendance.findIndex((a) => a.id === existing.id);
      this.attendance[idx] = record;
    } else {
      this.attendance.unshift(record);
    }

    coreAuthService.logAction(
      coreAuthService.getCurrentUser().name,
      'MANUAL_ATTENDANCE_SIGN_IN',
      'HRM',
      `Manual attendance entry for ${emp.firstName} ${emp.lastName} on ${data.date} (${data.clockInTime} - ${data.clockOutTime || '05:00 PM'}) [Net Worked: ${derivedHours}h]${warning ? ' [DUPLICATE RESOLVED]' : ''}`
    );

    return { record, warning };
  }

  recordClockIn(employeeId: string): AttendanceRecord {
    const emp = this.employees.find((e) => e.id === employeeId);
    if (!emp) throw new Error('Employee not found');

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toISOString().split('T')[0];

    const calculatedHours = this.calculateNetWorkedHours(timeStr, undefined);

    const record: AttendanceRecord = {
      id: `att-${Date.now()}`,
      employeeId: emp.id,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      date: dateStr,
      clockInTime: timeStr,
      hoursWorked: calculatedHours,
      status: now.getHours() > 9 ? 'LATE' : 'PRESENT',
    };

    this.attendance.unshift(record);
    coreAuthService.logAction(
      emp.firstName + ' ' + emp.lastName,
      'CLOCK_IN',
      'HRM',
      `Clock-in synced at ${timeStr} (Calculated Net Shift: ${calculatedHours}h)`
    );
    return record;
  }

  updateLeaveStatus(leaveId: string, status: 'APPROVED' | 'REJECTED'): LeaveRequest {
    const leave = this.leaveRequests.find((l) => l.id === leaveId);
    if (!leave) throw new Error('Leave request not found');

    leave.status = status;
    leave.approvedBy = coreAuthService.getCurrentUser().name;

    coreAuthService.logAction(
      leave.approvedBy,
      'LEAVE_STATUS_UPDATE',
      'HRM',
      `${status} leave request for ${leave.employeeName} (${leave.totalDays} days)`
    );
    return { ...leave };
  }

  submitLeaveRequest(data: Omit<LeaveRequest, 'id' | 'status' | 'approvedBy'>): LeaveRequest {
    const newLeave: LeaveRequest = {
      ...data,
      id: `lev-${Date.now()}`,
      status: 'PENDING',
    };
    this.leaveRequests.unshift(newLeave);
    return newLeave;
  }

  /**
   * Calculates precision payroll records for a period using Decimal.js
   */
  calculatePayrollRecords(periodId: string): PayrollRecord[] {
    return this.employees
      .filter((e) => e.status === 'ACTIVE')
      .map((emp) => {
        const base = toDecimal(emp.baseSalaryMonthly);
        const allow = toDecimal(emp.allowances);
        const gross = base.plus(allow);

        const tax = calcPercentage(gross, emp.taxDeductionRate);
        const pension = calcPercentage(gross, emp.pensionRate);
        const totalDed = tax.plus(pension);
        const net = gross.minus(totalDed);

        return {
          id: `pr-${periodId}-${emp.id}`,
          payrollPeriodId: periodId,
          employeeId: emp.id,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          department: emp.department,
          baseSalary: base.toFixed(2),
          allowances: allow.toFixed(2),
          grossSalary: gross.toFixed(2),
          taxDeduction: tax.toFixed(2),
          pensionDeduction: pension.toFixed(2),
          totalDeductions: totalDed.toFixed(2),
          netSalary: net.toFixed(2),
          status: 'CALCULATED',
        };
      });
  }

  /**
   * Finalizes payroll period and triggers BullMQ/Memory async event to GL engine!
   */
  async finalizePayrollPeriod(periodId: string): Promise<PayrollPeriod> {
    const period = this.payrollPeriods.find((p) => p.id === periodId);
    if (!period) throw new Error('Payroll period not found');
    if (period.status === 'FINALIZED') throw new Error('Payroll period is already finalized');

    period.status = 'FINALIZED';
    period.finalizedAt = new Date().toISOString();

    // Emit decoupled asynchronous event for cross-domain processing
    await eventBus.publish('hrm.payroll.finalized', {
      periodId: period.id,
      periodName: period.periodName,
      totalGross: period.totalGross,
      totalNet: period.totalNet,
      totalTax: period.records.reduce((acc, r) => acc.plus(toDecimal(r.taxDeduction)), toDecimal(0)).toFixed(2),
      totalPension: period.records.reduce((acc, r) => acc.plus(toDecimal(r.pensionDeduction)), toDecimal(0)).toFixed(2),
      finalizedBy: coreAuthService.getCurrentUser().name,
      timestamp: period.finalizedAt,
    });

    coreAuthService.logAction(
      coreAuthService.getCurrentUser().name,
      'FINALIZE_PAYROLL',
      'HRM',
      `Finalized ${period.periodName} ($${period.totalGross} gross). Emitted event to GL.`
    );

    return { ...period };
  }
}

export const hrmEngine = new HRMEngine();
