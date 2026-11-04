import React, { useState, useEffect } from 'react';
import {
  Users,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  PlusCircle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  DollarSign,
  Briefcase,
  AlertCircle,
  AlertTriangle,
  Sparkles,
  Zap,
} from 'lucide-react';
import { hrmEngine } from '../domains/hrm/hrm-engine';
import { coreAuthService } from '../domains/core/rbac';
import { formatCurrency, toDecimal } from '../lib/math';
import { Employee, LeaveRequest, PayrollPeriod, Department, AttendanceConfig } from '../types';
import { Modal } from './Modal';

export type HRMSubTab = 'payroll' | 'employees' | 'departments' | 'attendance' | 'attendance_config' | 'leave';

interface HRMViewProps {
  initialSubTab?: string;
  subTabOverride?: string;
  onSubTabChange?: (tab: HRMSubTab) => void;
}

export const HRMView: React.FC<HRMViewProps> = ({
  initialSubTab = 'employees',
  subTabOverride,
  onSubTabChange,
}) => {
  const [subTab, setSubTab] = useState<HRMSubTab>(() => {
    if (
      initialSubTab === 'payroll' ||
      initialSubTab === 'departments' ||
      initialSubTab === 'attendance' ||
      initialSubTab === 'attendance_config' ||
      initialSubTab === 'leave'
    ) {
      return initialSubTab as HRMSubTab;
    }
    return 'employees';
  });

  const handleSubTabChange = (t: HRMSubTab) => {
    setSubTab(t);
    onSubTabChange?.(t);
  };

  // Keep subTab synced when prop changes from sidebar navigation
  useEffect(() => {
    if (subTabOverride) {
      if (
        subTabOverride === 'payroll' ||
        subTabOverride === 'employees' ||
        subTabOverride === 'departments' ||
        subTabOverride === 'attendance' ||
        subTabOverride === 'attendance_config' ||
        subTabOverride === 'leave'
      ) {
        setSubTab(subTabOverride as HRMSubTab);
      }
    }
  }, [subTabOverride]);

  const [showAddEmpModal, setShowAddEmpModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [showDeleteEmpConfirm, setShowDeleteEmpConfirm] = useState<string | null>(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showManualAttendanceModal, setShowManualAttendanceModal] = useState(false);
  const [attendanceWarning, setAttendanceWarning] = useState<string | null>(null);
  const [attendanceSuccess, setAttendanceSuccess] = useState<string | null>(null);
  const [finalizedNotification, setFinalizedNotification] = useState<string | null>(null);

  // Department State
  const [showAddDeptModal, setShowAddDeptModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);

  // Trigger state update
  const [, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);

  const employees = hrmEngine.getEmployees();
  const departments = hrmEngine.getDepartments();
  const attendance = hrmEngine.getAttendance();
  const leaveRequests = hrmEngine.getLeaveRequests();
  const payrollPeriods = hrmEngine.getPayrollPeriods();
  const currentPeriod = payrollPeriods[0];

  const currentUser = coreAuthService.getCurrentUser();
  const isHRorAdmin =
    currentUser.role === 'SUPER_ADMIN' ||
    currentUser.role === 'HR_DIRECTOR' ||
    coreAuthService.hasPermission('hrm:manage_employees');

  // New Employee Form State
  const [newEmpData, setNewEmpData] = useState<Omit<Employee, 'id' | 'employeeCode'>>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    department: 'Engineering',
    jobTitle: '',
    status: 'ACTIVE',
    hireDate: new Date().toISOString().split('T')[0],
    baseSalaryMonthly: '9000.00',
    allowances: '800.00',
    taxDeductionRate: '20',
    pensionRate: '5',
    bankAccount: 'US-CHASE-77890123',
  });

  // New Leave Form State
  const [leaveEmployeeId, setLeaveEmployeeId] = useState(employees[0]?.id || '');
  const [leaveType, setLeaveType] = useState<'ANNUAL' | 'SICK' | 'MATERNITY' | 'UNPAID'>('ANNUAL');
  const [leaveStartDate, setLeaveStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [leaveEndDate, setLeaveEndDate] = useState(
    new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]
  );
  const [leaveDays, setLeaveDays] = useState(3);
  const [leaveReason, setLeaveReason] = useState('');

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    hrmEngine.addEmployee(newEmpData);
    setShowAddEmpModal(false);
    refresh();
  };

  const handleSimulateClockIn = () => {
    if (employees.length === 0) return;
    const randomEmp = employees[Math.floor(Math.random() * employees.length)];
    hrmEngine.recordClockIn(randomEmp.id);
    refresh();
  };

  const handleLeaveStatus = (leaveId: string, status: 'APPROVED' | 'REJECTED') => {
    hrmEngine.updateLeaveStatus(leaveId, status);
    refresh();
  };

  const handleSubmitLeave = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find((e) => e.id === leaveEmployeeId);
    if (!emp) return;

    hrmEngine.submitLeaveRequest({
      employeeId: emp.id,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      leaveType,
      startDate: leaveStartDate,
      endDate: leaveEndDate,
      totalDays: Number(leaveDays),
      reason: leaveReason,
    });
    setShowLeaveModal(false);
    setLeaveReason('');
    refresh();
  };

  const handleFinalizePayroll = async (periodId: string) => {
    try {
      const finalized = await hrmEngine.finalizePayrollPeriod(periodId);
      setFinalizedNotification(
        `Payroll ${finalized.periodName} finalized! Emitted 'hrm.payroll.finalized' event on queue. General Ledger automatically posted balanced debit/credit lines.`
      );
      refresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Sub-Navigation (Sticky top-16 z-20) */}
      <div className="sticky top-16 z-20 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md py-3 -mt-3 -mx-1 px-1 border-b border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Human Resource Management (HRM) & Payroll Engine</span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Enterprise staff directory, department hierarchy, attendance tracking, and precision payroll engine.
          </p>
        </div>

        {/* Sub-tabs */}
        <div className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => handleSubTabChange('employees')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              subTab === 'employees'
                ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            Staff Directory ({employees.length})
          </button>
          <button
            onClick={() => handleSubTabChange('departments')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              subTab === 'departments'
                ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            Departments ({departments.length})
          </button>
          <button
            onClick={() => handleSubTabChange('attendance')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              subTab === 'attendance'
                ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            Attendance Logs
          </button>
          <button
            onClick={() => handleSubTabChange('attendance_config')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              subTab === 'attendance_config'
                ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            Attendance Config
          </button>
          <button
            onClick={() => handleSubTabChange('leave')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              subTab === 'leave'
                ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            Leave Requests ({leaveRequests.length})
          </button>
          <button
            onClick={() => handleSubTabChange('payroll')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              subTab === 'payroll'
                ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            Payroll Engine
          </button>
        </div>
      </div>

      {/* Finalized Banner Notification */}
      {finalizedNotification && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-700 text-slate-900 dark:text-white flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-emerald-900 dark:text-white">Cross-Domain Workflow Success!</div>
              <p className="text-xs text-emerald-700 dark:text-emerald-300/80">{finalizedNotification}</p>
            </div>
          </div>
          <button
            onClick={() => setFinalizedNotification(null)}
            className="text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-white text-xs underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ================= SUBTAB: PAYROLL PROCESSING ================= */}
      {subTab === 'payroll' && currentPeriod && (
        <div className="space-y-6">
          {/* Payroll Period Header Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{currentPeriod.periodName}</h3>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      currentPeriod.status === 'FINALIZED'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                    }`}
                  >
                    {currentPeriod.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Calculation Cycle: {currentPeriod.startDate} to {currentPeriod.endDate} • {currentPeriod.employeeCount} eligible employees
                </p>
              </div>

              {currentPeriod.status === 'OPEN' ? (
                <button
                  id="btn-finalize-payroll"
                  onClick={() => handleFinalizePayroll(currentPeriod.id)}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 shadow-md shadow-emerald-600/30 transition"
                >
                  <Zap className="w-4 h-4" />
                  <span>Finalize & Emit Event to General Ledger</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-lg">
                  <CheckCircle className="w-4 h-4" />
                  <span>Finalized & Posted to General Ledger</span>
                </div>
              )}
            </div>

            {/* Financial Totals Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
                <span className="text-xs text-slate-500 dark:text-slate-400">Total Gross Salary</span>
                <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {formatCurrency(currentPeriod.totalGross)}
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">Debits #5100 Salaries</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
                <span className="text-xs text-slate-500 dark:text-slate-400">Tax Withholding</span>
                <div className="text-xl font-bold text-amber-700 dark:text-amber-400 mt-1">
                  {formatCurrency(
                    currentPeriod.records.reduce((acc, r) => acc.plus(toDecimal(r.taxDeduction)), toDecimal(0)).toFixed(2)
                  )}
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">Credits #2100 Tax Payable</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
                <span className="text-xs text-slate-500 dark:text-slate-400">Retirement / Pension Match</span>
                <div className="text-xl font-bold text-amber-700 dark:text-amber-400 mt-1">
                  {formatCurrency(
                    currentPeriod.records.reduce((acc, r) => acc.plus(toDecimal(r.pensionDeduction)), toDecimal(0)).toFixed(2)
                  )}
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">Credits #2110 Pension Payable</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
                <span className="text-xs text-slate-500 dark:text-slate-400">Net Direct Deposit Payout</span>
                <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                  {formatCurrency(currentPeriod.totalNet)}
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">Credits #1010 Operating Cash</span>
              </div>
            </div>
          </div>

          {/* Detailed Employee Payroll Records Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-900 dark:text-white">Employee Breakdown (Calculated via Decimal.js)</span>
              <span className="text-slate-500 dark:text-slate-400">Fixed-point arithmetic precision (2 decimal places)</span>
            </div>

            <div className="w-full overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs min-w-[900px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 font-semibold">
                    <th className="py-2.5 px-4">Employee</th>
                    <th className="py-2.5 px-4">Department</th>
                    <th className="py-2.5 px-4 text-right">Base Salary</th>
                    <th className="py-2.5 px-4 text-right">Allowances</th>
                    <th className="py-2.5 px-4 text-right">Gross Salary</th>
                    <th className="py-2.5 px-4 text-right">Tax Deduction</th>
                    <th className="py-2.5 px-4 text-right">Pension</th>
                    <th className="py-2.5 px-4 text-right">Net Take-Home</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                  {currentPeriod.records.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 text-slate-800 dark:text-slate-200">
                      <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white">{rec.employeeName}</td>
                      <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400">{rec.department}</td>
                      <td className="py-2.5 px-4 text-right font-mono">{formatCurrency(rec.baseSalary)}</td>
                      <td className="py-2.5 px-4 text-right font-mono">{formatCurrency(rec.allowances)}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-semibold text-slate-900 dark:text-white">
                        {formatCurrency(rec.grossSalary)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-amber-700 dark:text-amber-400/90">
                        -{formatCurrency(rec.taxDeduction)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-amber-700 dark:text-amber-400/90">
                        -{formatCurrency(rec.pensionDeduction)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        {formatCurrency(rec.netSalary)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 dark:bg-slate-900 font-bold border-t-2 border-slate-200 dark:border-slate-700">
                    <td colSpan={4} className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">
                      CYCLE TOTALS:
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-900 dark:text-white">
                      {formatCurrency(currentPeriod.totalGross)}
                    </td>
                    <td colSpan={2} className="py-3 px-4 text-right font-mono text-amber-700 dark:text-amber-400">
                      -{formatCurrency(currentPeriod.totalDeductions)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-700 dark:text-emerald-400">
                      {formatCurrency(currentPeriod.totalNet)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= SUBTAB: EMPLOYEE DIRECTORY ================= */}
      {subTab === 'employees' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Total <span className="font-semibold text-slate-900 dark:text-white">{employees.length}</span> active staff members
            </div>
            {isHRorAdmin && (
              <button
                id="btn-add-employee"
                onClick={() => setShowAddEmpModal(true)}
                className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Register Employee</span>
              </button>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="w-full overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs min-w-[900px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 font-semibold">
                    <th className="py-3 px-5">Code</th>
                    <th className="py-3 px-5">Name & Title</th>
                    <th className="py-3 px-5">Department</th>
                    <th className="py-3 px-5">Contact</th>
                    <th className="py-3 px-5 text-right">Base Salary</th>
                    <th className="py-3 px-5 text-right">Tax / Pension</th>
                    <th className="py-3 px-5">Status</th>
                    {isHRorAdmin && <th className="py-3 px-5 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                  {employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 text-slate-800 dark:text-slate-200">
                      <td className="py-3 px-5 font-mono text-indigo-600 dark:text-indigo-400 font-bold">{emp.employeeCode}</td>
                      <td className="py-3 px-5">
                        <div className="font-semibold text-slate-900 dark:text-white">{emp.firstName} {emp.lastName}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">{emp.jobTitle}</div>
                      </td>
                      <td className="py-3 px-5">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px]">
                          {emp.department}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-slate-600 dark:text-slate-400 text-xs">
                        <div>{emp.email}</div>
                        <div className="text-[10px] text-slate-500">{emp.phone}</div>
                      </td>
                      <td className="py-3 px-5 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {formatCurrency(emp.baseSalaryMonthly)}
                      </td>
                      <td className="py-3 px-5 text-right font-mono text-slate-600 dark:text-slate-300">
                        {emp.taxDeductionRate}% / {emp.pensionRate}%
                      </td>
                      <td className="py-3 px-5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800/50">
                          {emp.status}
                        </span>
                      </td>
                      {isHRorAdmin && (
                        <td className="py-3 px-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setEditingEmployee(emp)}
                              className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 font-semibold text-[11px] transition cursor-pointer"
                              title="Edit Employee Profile"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setShowDeleteEmpConfirm(emp.id)}
                              className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 font-semibold text-[11px] transition cursor-pointer"
                              title="Delete Employee Record"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= SUBTAB: ATTENDANCE LOGS ================= */}
      {subTab === 'attendance' && (
        <div className="space-y-4">
          {/* Duplicate Detection Warning Banner */}
          {attendanceWarning && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                <div>
                  <span className="font-bold block">⚠️ Smart Duplicate Clock-In Warning</span>
                  <p className="mt-0.5">{attendanceWarning}</p>
                </div>
              </div>
              <button
                onClick={() => setAttendanceWarning(null)}
                className="px-2 py-1 rounded bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-semibold cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Success Banner */}
          {attendanceSuccess && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 text-xs flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{attendanceSuccess}</span>
              </div>
              <button
                onClick={() => setAttendanceSuccess(null)}
                className="px-2 py-1 rounded bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 font-semibold cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Daily Attendance & Clock-In Synchronization</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Integrated webhook listeners for biometric & time-card terminals with duplicate prevention.</p>
            </div>
            <div className="flex items-center gap-2">
              {isHRorAdmin && (
                <button
                  onClick={() => setShowManualAttendanceModal(true)}
                  className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Manual Attendance Entry</span>
                </button>
              )}
              <button
                onClick={handleSimulateClockIn}
                className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
              >
                <Clock className="w-4 h-4 text-indigo-500" />
                <span>Simulate Sync</span>
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="w-full overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs min-w-[750px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 font-semibold">
                    <th className="py-3 px-5">Date</th>
                    <th className="py-3 px-5">Employee</th>
                    <th className="py-3 px-5">Clock In</th>
                    <th className="py-3 px-5">Clock Out</th>
                    <th className="py-3 px-5">Hours</th>
                    <th className="py-3 px-5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                  {attendance.map((att) => (
                    <tr key={att.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 text-slate-800 dark:text-slate-200">
                      <td className="py-3 px-5 font-mono text-slate-500 dark:text-slate-400">{att.date}</td>
                      <td className="py-3 px-5 font-semibold text-slate-900 dark:text-white">{att.employeeName}</td>
                      <td className="py-3 px-5 font-mono text-emerald-700 dark:text-emerald-400">{att.clockInTime}</td>
                      <td className="py-3 px-5 font-mono text-slate-500 dark:text-slate-400">{att.clockOutTime || 'Active Shift'}</td>
                      <td className="py-3 px-5 font-mono">{att.hoursWorked} hrs</td>
                      <td className="py-3 px-5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            att.status === 'PRESENT'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800/50'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-300 dark:border-amber-800/50'
                          }`}
                        >
                          {att.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= SUBTAB: ATTENDANCE CONFIGURATION ================= */}
      {subTab === 'attendance_config' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Attendance Policy & Shift Configuration</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure corporate shifts, biometric terminal webhooks, grace periods, and overtime multiplier rules.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 font-medium">
                Active Policy: Standard 40h Flex
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Shift Rules Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <span className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">Default Shift Windows</span>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono">HQ Core</span>
              </div>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800/40">
                  <span className="text-slate-500 dark:text-slate-400">Morning Shift (Standard)</span>
                  <span className="font-mono text-slate-900 dark:text-white font-semibold">09:00 - 17:30</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800/40">
                  <span className="text-slate-500 dark:text-slate-400">Engineering Flex Window</span>
                  <span className="font-mono text-slate-900 dark:text-white font-semibold">10:00 - 19:00</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800/40">
                  <span className="text-slate-500 dark:text-slate-400">Grace Period for Late Clock-In</span>
                  <span className="font-mono text-amber-700 dark:text-amber-400 font-semibold">15 Minutes</span>
                </div>
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-slate-500 dark:text-slate-400">Overtime Threshold</span>
                  <span className="font-mono text-emerald-700 dark:text-emerald-400 font-semibold">&gt; 8.0 hrs / day</span>
                </div>
              </div>
            </div>

            {/* Overtime & Holiday Multipliers */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <span className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">Payroll Multipliers</span>
                <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono">Auto-Sync to GL</span>
              </div>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800/40">
                  <span className="text-slate-500 dark:text-slate-400">Standard Overtime (1.5x)</span>
                  <span className="font-mono text-emerald-700 dark:text-emerald-400 font-semibold">Enabled</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800/40">
                  <span className="text-slate-500 dark:text-slate-400">Weekend Emergency Shifts</span>
                  <span className="font-mono text-purple-700 dark:text-purple-400 font-semibold">2.0x Rate</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800/40">
                  <span className="text-slate-500 dark:text-slate-400">Public Holiday Multiplier</span>
                  <span className="font-mono text-amber-700 dark:text-amber-400 font-semibold">2.5x Rate</span>
                </div>
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-slate-500 dark:text-slate-400">Unexcused Absence Penalty</span>
                  <span className="font-mono text-rose-700 dark:text-rose-400 font-semibold">1.0 Day Deduction</span>
                </div>
              </div>
            </div>

            {/* Biometric Integration Status */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <span className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">Hardware Webhook Gateways</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">Live Sync</span>
              </div>
              <div className="space-y-3 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">Anviz FacePass 7 Terminal</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">HQ 4th Floor Turnstile</div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800/50">Online</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">ZKTeco BioStation 3</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">Austin Data Center Gate</div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800/50">Online</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= SUBTAB: LEAVE REQUESTS ================= */}
      {subTab === 'leave' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Employee Leave Management</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">PTO, Sick leave, and Parental leaves with manager approval flow</p>
            </div>
            <button
              onClick={() => setShowLeaveModal(true)}
              className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Submit Leave Request</span>
            </button>
          </div>

          <div className="space-y-3">
            {leaveRequests.map((req) => (
              <div
                key={req.id}
                className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">{req.employeeName}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-indigo-700 dark:text-indigo-300">
                      {req.leaveType} LEAVE
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        req.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800/50'
                          : req.status === 'REJECTED'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-300 dark:border-rose-800/50'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-300 dark:border-amber-800/50'
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-3">
                    <span>Duration: {req.startDate} to {req.endDate} ({req.totalDays} days)</span>
                    <span>•</span>
                    <span>Reason: "{req.reason}"</span>
                  </div>
                  {req.approvedBy && (
                    <div className="text-[10px] text-slate-500">Reviewed by: {req.approvedBy}</div>
                  )}
                </div>

                {req.status === 'PENDING' && coreAuthService.hasPermission('hrm:approve_leave') && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleLeaveStatus(req.id, 'APPROVED')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => handleLeaveStatus(req.id, 'REJECTED')}
                      className="px-3 py-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= MODAL: REGISTER EMPLOYEE ================= */}
      {showAddEmpModal && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Register New Employee</h3>
              <button onClick={() => setShowAddEmpModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-base">✕</button>
            </div>

            <form onSubmit={handleAddEmployee} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={newEmpData.firstName}
                    onChange={(e) => setNewEmpData({ ...newEmpData, firstName: e.target.value })}
                    className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={newEmpData.lastName}
                    onChange={(e) => setNewEmpData({ ...newEmpData, lastName: e.target.value })}
                    className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={newEmpData.email}
                    onChange={(e) => setNewEmpData({ ...newEmpData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Phone</label>
                  <input
                    type="text"
                    value={newEmpData.phone}
                    onChange={(e) => setNewEmpData({ ...newEmpData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Department</label>
                  <select
                    value={newEmpData.department}
                    onChange={(e) => setNewEmpData({ ...newEmpData, department: e.target.value as any })}
                    className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Finance">Finance</option>
                    <option value="Human Resources">Human Resources</option>
                    <option value="Operations">Operations</option>
                    <option value="Sales">Sales</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Job Title</label>
                  <input
                    type="text"
                    required
                    value={newEmpData.jobTitle}
                    onChange={(e) => setNewEmpData({ ...newEmpData, jobTitle: e.target.value })}
                    className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Base Monthly Salary ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newEmpData.baseSalaryMonthly}
                    onChange={(e) => setNewEmpData({ ...newEmpData, baseSalaryMonthly: e.target.value })}
                    className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Monthly Allowances ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newEmpData.allowances}
                    onChange={(e) => setNewEmpData({ ...newEmpData, allowances: e.target.value })}
                    className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Tax Withholding Rate (%)</label>
                  <input
                    type="number"
                    value={newEmpData.taxDeductionRate}
                    onChange={(e) => setNewEmpData({ ...newEmpData, taxDeductionRate: e.target.value })}
                    className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Pension Withholding Rate (%)</label>
                  <input
                    type="number"
                    value={newEmpData.pensionRate}
                    onChange={(e) => setNewEmpData({ ...newEmpData, pensionRate: e.target.value })}
                    className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddEmpModal(false)}
                  className="px-4 py-2 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                >
                  Save Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: SUBMIT LEAVE ================= */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Submit Leave Request</h3>
              <button onClick={() => setShowLeaveModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-base">✕</button>
            </div>

            <form onSubmit={handleSubmitLeave} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Employee</label>
                <select
                  value={leaveEmployeeId}
                  onChange={(e) => setLeaveEmployeeId(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.firstName} {e.lastName} ({e.department})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Leave Type</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="ANNUAL">Annual Leave / Vacation</option>
                  <option value="SICK">Sick Leave</option>
                  <option value="MATERNITY">Parental / Maternity</option>
                  <option value="UNPAID">Unpaid Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={leaveStartDate}
                    onChange={(e) => setLeaveStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={leaveEndDate}
                    onChange={(e) => setLeaveEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Total Days</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={leaveDays}
                  onChange={(e) => setLeaveDays(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Reason / Notes</label>
                <textarea
                  rows={2}
                  required
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="Reason for leave..."
                  className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(false)}
                  className="px-3 py-1.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
