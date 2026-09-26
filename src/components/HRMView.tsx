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
  Sparkles,
  Zap,
  Building,
  Edit,
  Trash2,
  AlertTriangle,
  UserCheck,
  Sliders,
  Check,
  FileText,
  Shield,
  MapPin,
  Compass,
  Navigation,
  Radio,
  LocateFixed,
} from 'lucide-react';
import {
  hrmEngine,
  STANDARD_HOD_PRIVILEGES,
  calculateExactShiftDuration,
  calculateHaversineDistanceMeters,
} from '../domains/hrm/hrm-engine';
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

  // Modals state
  const [showAddEmpModal, setShowAddEmpModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [showDeleteEmpConfirm, setShowDeleteEmpConfirm] = useState<string | null>(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showManualAttendanceModal, setShowManualAttendanceModal] = useState(false);

  // Department Modals state
  const [showAddDeptModal, setShowAddDeptModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [showDeleteDeptConfirm, setShowDeleteDeptConfirm] = useState<string | null>(null);

  // Feedback notifications
  const [attendanceWarning, setAttendanceWarning] = useState<string | null>(null);
  const [attendanceSuccess, setAttendanceSuccess] = useState<string | null>(null);
  const [deptSuccess, setDeptSuccess] = useState<string | null>(null);
  const [configSuccess, setConfigSuccess] = useState<string | null>(null);
  const [finalizedNotification, setFinalizedNotification] = useState<string | null>(null);

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
    currentUser.permissions?.includes('hrm:manage_employees');

  // Dynamic Attendance Configuration State
  const [attendanceConfig, setAttendanceConfig] = useState<AttendanceConfig>(hrmEngine.getAttendanceConfig());

  // New Employee Form State
  const [newEmpData, setNewEmpData] = useState<Omit<Employee, 'id' | 'employeeCode'>>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    department: departments[0]?.name || 'Engineering',
    jobTitle: '',
    status: 'ACTIVE',
    hireDate: new Date().toISOString().split('T')[0],
    baseSalaryMonthly: '9000.00',
    allowances: '800.00',
    taxDeductionRate: '20',
    pensionRate: '5',
    bankAccount: 'US-CHASE-77890123',
  });

  // Edit Employee Form State
  const [editEmpData, setEditEmpData] = useState<Partial<Employee>>({});

  useEffect(() => {
    if (editingEmployee) {
      setEditEmpData({ ...editingEmployee });
    }
  }, [editingEmployee]);

  // Manual Attendance Form State
  const [manualAttEmployeeId, setManualAttEmployeeId] = useState(employees[0]?.id || '');
  const [manualAttDate, setManualAttDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualAttClockIn, setManualAttClockIn] = useState('09:00 AM');
  const [manualAttClockOut, setManualAttClockOut] = useState('05:00 PM');
  const [manualAttHours, setManualAttHours] = useState(hrmEngine.calculateNetWorkedHours('09:00 AM', '05:00 PM'));
  const [manualAttStatus, setManualAttStatus] = useState<'PRESENT' | 'LATE' | 'HALF_DAY' | 'ABSENT'>('PRESENT');

  // New Department Form State
  const [newDeptData, setNewDeptData] = useState({
    code: '',
    name: '',
    description: '',
    headOfDepartmentId: employees[0]?.id || '',
    budgetAnnual: '1000000.00',
    approvalPrivileges: ['leave_approval', 'expense_review'],
  });

  // Edit Department Form State
  const [editDeptData, setEditDeptData] = useState<Partial<Department>>({});

  useEffect(() => {
    if (editingDept) {
      setEditDeptData({ ...editingDept });
    }
  }, [editingDept]);

  // New Leave Form State
  const [leaveEmployeeId, setLeaveEmployeeId] = useState(employees[0]?.id || '');
  const [leaveType, setLeaveType] = useState<'ANNUAL' | 'SICK' | 'MATERNITY' | 'UNPAID'>('ANNUAL');
  const [leaveStartDate, setLeaveStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [leaveEndDate, setLeaveEndDate] = useState(
    new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]
  );
  const [leaveDays, setLeaveDays] = useState(3);
  const [leaveReason, setLeaveReason] = useState('');

  // 1. Employee CRUD Handlers
  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isHRorAdmin) return;
    hrmEngine.addEmployee(newEmpData);
    setShowAddEmpModal(false);
    setNewEmpData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      department: departments[0]?.name || 'Engineering',
      jobTitle: '',
      status: 'ACTIVE',
      hireDate: new Date().toISOString().split('T')[0],
      baseSalaryMonthly: '9000.00',
      allowances: '800.00',
      taxDeductionRate: '20',
      pensionRate: '5',
      bankAccount: 'US-CHASE-77890123',
    });
    refresh();
  };

  const handleUpdateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isHRorAdmin || !editingEmployee) return;
    hrmEngine.updateEmployee(editingEmployee.id, editEmpData);
    setEditingEmployee(null);
    refresh();
  };

  const handleDeleteEmployee = () => {
    if (!isHRorAdmin || !showDeleteEmpConfirm) return;
    hrmEngine.deleteEmployee(showDeleteEmpConfirm);
    setShowDeleteEmpConfirm(null);
    refresh();
  };

  // 2. Department CRUD Handlers
  const handleCreateDepartment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isHRorAdmin) return;
    const hod = employees.find((emp) => emp.id === newDeptData.headOfDepartmentId);
    hrmEngine.createDepartment({
      code: newDeptData.code.toUpperCase().trim(),
      name: newDeptData.name.trim(),
      description: newDeptData.description.trim(),
      headOfDepartmentId: newDeptData.headOfDepartmentId,
      headOfDepartmentName: hod ? `${hod.firstName} ${hod.lastName}` : 'Unassigned',
      headOfDepartmentEmail: hod ? hod.email : '',
      budgetAnnual: newDeptData.budgetAnnual,
      employeeCount: 0,
      approvalPrivileges: newDeptData.approvalPrivileges,
    });
    setShowAddDeptModal(false);
    setNewDeptData({
      code: '',
      name: '',
      description: '',
      headOfDepartmentId: employees[0]?.id || '',
      budgetAnnual: '1000000.00',
      approvalPrivileges: ['leave_approval', 'expense_review'],
    });
    setDeptSuccess('New department created successfully with HOD approval privileges assigned.');
    setTimeout(() => setDeptSuccess(null), 4000);
    refresh();
  };

  const handleUpdateDepartment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isHRorAdmin || !editingDept) return;
    const hod = employees.find((emp) => emp.id === editDeptData.headOfDepartmentId);
    hrmEngine.updateDepartment(editingDept.id, {
      ...editDeptData,
      headOfDepartmentName: hod ? `${hod.firstName} ${hod.lastName}` : editDeptData.headOfDepartmentName,
      headOfDepartmentEmail: hod ? hod.email : editDeptData.headOfDepartmentEmail,
    });
    setEditingDept(null);
    setDeptSuccess(`Updated department ${editingDept.name} and HOD privileges.`);
    setTimeout(() => setDeptSuccess(null), 4000);
    refresh();
  };

  const handleDeleteDepartment = () => {
    if (!isHRorAdmin || !showDeleteDeptConfirm) return;
    hrmEngine.deleteDepartment(showDeleteDeptConfirm);
    setShowDeleteDeptConfirm(null);
    setDeptSuccess('Department deleted successfully.');
    setTimeout(() => setDeptSuccess(null), 4000);
    refresh();
  };

  // 3. Attendance Handlers
  const handleSimulateClockIn = () => {
    if (employees.length === 0) return;
    const randomEmp = employees[Math.floor(Math.random() * employees.length)];
    hrmEngine.recordClockIn(randomEmp.id);
    setAttendanceSuccess(`Simulated terminal clock-in sync for ${randomEmp.firstName} ${randomEmp.lastName}`);
    setTimeout(() => setAttendanceSuccess(null), 4000);
    refresh();
  };

  const handleManualAttendanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isHRorAdmin) return;
    try {
      const res = hrmEngine.recordManualAttendance({
        employeeId: manualAttEmployeeId,
        date: manualAttDate,
        clockInTime: manualAttClockIn,
        clockOutTime: manualAttClockOut,
        hoursWorked: manualAttHours,
        status: manualAttStatus,
      });

      if (res.warning) {
        setAttendanceWarning(res.warning);
        setAttendanceSuccess(null);
      } else {
        setAttendanceSuccess(`Manual attendance record created for ${res.record.employeeName} on ${res.record.date}.`);
        setAttendanceWarning(null);
      }
      setShowManualAttendanceModal(false);
      refresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // 4. Attendance Configuration Save
  const handleSaveAttendanceConfig = (e: React.FormEvent) => {
    e.preventDefault();
    hrmEngine.updateAttendanceConfig(attendanceConfig);
    setConfigSuccess('Attendance policy, work hours, grace periods, and shift templates updated successfully!');
    setTimeout(() => setConfigSuccess(null), 5000);
    refresh();
  };

  // 5. Leave Request Handlers
  const handleSubmitLeave = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find((x) => x.id === leaveEmployeeId);
    if (!emp) return;

    hrmEngine.submitLeaveRequest({
      employeeId: emp.id,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      leaveType,
      startDate: leaveStartDate,
      endDate: leaveEndDate,
      totalDays: leaveDays,
      reason: leaveReason,
    });

    setShowLeaveModal(false);
    setLeaveReason('');
    refresh();
  };

  const handleLeaveStatus = (id: string, status: 'APPROVED' | 'REJECTED') => {
    hrmEngine.updateLeaveStatus(id, status);
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
      {/* Module Hero Header Card */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white dark:bg-slate-900/80 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Human Resource Management (HRM) & Workforce Hub
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Enterprise staff directory, department hierarchy with HOD approvals, biometric attendance, and precision payroll.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-semibold font-mono text-[11px] flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5" />
            {employees.filter((e) => e.status === 'ACTIVE').length} Active Personnel
          </span>
        </div>
      </div>

      {/* Prominent Sub-Navigation Switcher (Sticky top-16 z-20) */}
      <div className="sticky top-16 z-20 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md py-3 -mt-3 -mx-1 px-1 border-b border-slate-200/80 dark:border-slate-800/80 mb-6 flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-thin max-w-full">
        <button
          onClick={() => handleSubTabChange('employees')}
          className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition cursor-pointer ${
            subTab === 'employees'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>👥 Staff Directory ({employees.length})</span>
        </button>

        <button
          onClick={() => handleSubTabChange('departments')}
          className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition cursor-pointer ${
            subTab === 'departments'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>🏢 Departments & HODs ({departments.length})</span>
        </button>

        <button
          onClick={() => handleSubTabChange('attendance')}
          className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition cursor-pointer ${
            subTab === 'attendance'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>⏱️ Attendance Logs</span>
        </button>

        <button
          onClick={() => handleSubTabChange('attendance_config')}
          className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition cursor-pointer ${
            subTab === 'attendance_config'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>⚙️ Shift & Policy Config</span>
        </button>

        <button
          onClick={() => handleSubTabChange('leave')}
          className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition cursor-pointer ${
            subTab === 'leave'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>🏖️ Leave Requests ({leaveRequests.length})</span>
        </button>

        <button
          onClick={() => handleSubTabChange('payroll')}
          className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition cursor-pointer ${
            subTab === 'payroll'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>💰 Payroll Engine</span>
        </button>
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
            className="text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-white text-xs underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. STAFF DIRECTORY SUBTAB (Editable Profiles CRUD)                         */}
      {/* ========================================================================= */}
      {subTab === 'employees' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Registered Employee Directory</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage corporate workforce roster, base monthly compensation, and statutory withholdings.
              </p>
            </div>
            <div className="flex items-center gap-2">
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
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="w-full overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs min-w-[950px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 font-semibold">
                    <th className="py-3 px-5">Code</th>
                    <th className="py-3 px-5">Name & Title</th>
                    <th className="py-3 px-5">Department</th>
                    <th className="py-3 px-5">Contact</th>
                    <th className="py-3 px-5 text-right">Base Salary</th>
                    <th className="py-3 px-5 text-right">Tax / Pension</th>
                    <th className="py-3 px-5">Status</th>
                    {isHRorAdmin && <th className="py-3 px-5 text-right">Actions (HR)</th>}
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
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-medium">
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
                              className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/70 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-semibold text-[11px] transition cursor-pointer flex items-center gap-1 border border-indigo-200 dark:border-indigo-800"
                              title="Edit Employee Profile"
                            >
                              <Edit className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => setShowDeleteEmpConfirm(emp.id)}
                              className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 font-semibold text-[11px] transition cursor-pointer flex items-center gap-1 border border-rose-200 dark:border-rose-900"
                              title="Delete Employee Record"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Delete</span>
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

      {/* ========================================================================= */}
      {/* 2. DEPARTMENT DIRECTORY & HOD PRIVILEGES SUBTAB                           */}
      {/* ========================================================================= */}
      {subTab === 'departments' && (
        <div className="space-y-4">
          {deptSuccess && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 text-xs flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{deptSuccess}</span>
              </div>
              <button
                onClick={() => setDeptSuccess(null)}
                className="px-2 py-1 rounded bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 font-semibold cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Department Directory & Organizational Structure</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Manage operational departments, assign Head of Department (HOD) leaders with sign-off privileges, and control annual budgets.
              </p>
            </div>
            {isHRorAdmin && (
              <button
                onClick={() => setShowAddDeptModal(true)}
                className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create Department</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {departments.map((dept) => (
              <div
                key={dept.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold font-mono bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        {dept.code}
                      </span>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">{dept.name}</h4>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">{dept.employeeCount} Assigned Personnel</span>
                      </div>
                    </div>

                    {isHRorAdmin && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => setEditingDept(dept)}
                          className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                          title="Edit Department"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setShowDeleteDeptConfirm(dept.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                          title="Delete Department"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {dept.description}
                  </p>

                  {/* Head of Department (HOD) Badge Card */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                        {dept.headOfDepartmentName.split(' ').map((n) => n[0]).join('')}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-xs text-slate-900 dark:text-white">{dept.headOfDepartmentName}</span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            HOD
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 block">{dept.headOfDepartmentEmail}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Annual Budget</span>
                      <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">{formatCurrency(dept.budgetAnnual)}</span>
                    </div>
                  </div>

                  {/* Standard Approval Privileges */}
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                      Standard HOD Approval Privileges:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {dept.approvalPrivileges.map((priv) => {
                        const meta = STANDARD_HOD_PRIVILEGES.find((p) => p.id === priv);
                        const label = meta ? meta.label : priv.replace(/_/g, ' ');
                        return (
                          <span
                            key={priv}
                            className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1"
                            title={meta?.description || label}
                          >
                            <ShieldCheck className="w-3 h-3 text-indigo-500 shrink-0" />
                            <span>{label}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 flex justify-between items-center">
                  <span>Created {new Date(dept.createdAt).toLocaleDateString()}</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">HOD Privileges Enforced</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. ATTENDANCE LOGS & MANUAL HR SIGN-IN                                    */}
      {/* ========================================================================= */}
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

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Daily Attendance & Clock-In Synchronization</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Integrated webhook listeners for biometric terminals with duplicate detection.</p>
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

      {/* ========================================================================= */}
      {/* 4. DYNAMIC ATTENDANCE CONFIGURATION & TEMPLATE EDITOR                     */}
      {/* ========================================================================= */}
      {subTab === 'attendance_config' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm max-w-4xl mx-auto space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Dynamic Attendance Policy & Shift Template Configuration</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Configure corporate shifts, grace periods, overtime rules, lunch deductions, and custom logging templates.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700 shrink-0">
              HR Policy Engine
            </span>
          </div>

          {configSuccess && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{configSuccess}</span>
            </div>
          )}

          <form onSubmit={handleSaveAttendanceConfig} className="space-y-6 text-xs">
            {/* Shift Hours, Lunch Break Duration & Net Worked Hours Schedule */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-4">
              <span className="font-bold text-slate-900 dark:text-white uppercase text-[11px] tracking-wider block">
                1. Standard Work Hours, Lunch Break & Net Worked Hours Schedule
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                    Shift Start Time
                  </label>
                  <input
                    type="time"
                    required
                    value={attendanceConfig.workStartTime || '09:00'}
                    onChange={(e) => setAttendanceConfig({ ...attendanceConfig, workStartTime: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                    Shift End Time
                  </label>
                  <input
                    type="time"
                    required
                    value={attendanceConfig.workEndTime || '17:00'}
                    onChange={(e) => setAttendanceConfig({ ...attendanceConfig, workEndTime: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                    Lunch Break Duration (Minutes) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="180"
                    step="5"
                    required
                    value={attendanceConfig.lunchBreakMinutes ?? 60}
                    onChange={(e) =>
                      setAttendanceConfig({ ...attendanceConfig, lunchBreakMinutes: Number(e.target.value) })
                    }
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono font-bold"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Default: 60 mins (e.g. 30, 45, 60)</span>
                </div>
                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                    Standard Daily Net Hours Timeframe *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="16"
                    step="0.25"
                    required
                    value={attendanceConfig.standardDailyHours ?? 8}
                    onChange={(e) =>
                      setAttendanceConfig({ ...attendanceConfig, standardDailyHours: Number(e.target.value) })
                    }
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono font-bold"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Standard full-time daily baseline</span>
                </div>
              </div>

              {/* Dynamic Derivation Preview Callout */}
              <div className="p-3.5 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 font-bold text-indigo-900 dark:text-indigo-200">
                    <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span>Dynamic Net Worked Hours Derivation Engine</span>
                  </div>
                  <p className="text-[11px] text-indigo-700 dark:text-indigo-300">
                    Shift timeframe {attendanceConfig.workStartTime} to {attendanceConfig.workEndTime}
                    {attendanceConfig.autoDeductLunchBreak
                      ? ` with ${attendanceConfig.lunchBreakMinutes ?? 60}m lunch auto-deducted`
                      : ' (no lunch auto-deduction)'}
                  </p>
                </div>
                <div className="text-left sm:text-right shrink-0 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800/60 shadow-xs">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Calculated Net Shift</span>
                  <span className="text-sm font-bold font-mono text-indigo-600 dark:text-indigo-400">
                    {hrmEngine.calculateNetWorkedHours(
                      attendanceConfig.workStartTime,
                      attendanceConfig.workEndTime,
                      attendanceConfig.lunchBreakMinutes
                    )}
                  </span>
                </div>
              </div>

              <div className="pt-1">
                <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                  Late Grace Window (Minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  required
                  value={attendanceConfig.lateGraceMinutes ?? 15}
                  onChange={(e) =>
                    setAttendanceConfig({ ...attendanceConfig, lateGraceMinutes: Number(e.target.value) })
                  }
                  className="w-full sm:w-64 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono"
                />
              </div>
            </div>

            {/* Overtime & Shift Rules */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-4">
              <span className="font-bold text-slate-900 dark:text-white uppercase text-[11px] tracking-wider block">
                2. Overtime & Compensation Rules
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                    Overtime Threshold (Hours / Day)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="4"
                    max="16"
                    value={attendanceConfig.overtimeThresholdHours ?? 8}
                    onChange={(e) =>
                      setAttendanceConfig({ ...attendanceConfig, overtimeThresholdHours: Number(e.target.value) })
                    }
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                    Overtime Multiplier Rate
                  </label>
                  <input
                    type="text"
                    value={attendanceConfig.overtimeMultiplier || '1.5'}
                    onChange={(e) => setAttendanceConfig({ ...attendanceConfig, overtimeMultiplier: e.target.value })}
                    placeholder="e.g. 1.5"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                    Terminal Biometric Sync Interval (Min)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="180"
                    value={attendanceConfig.biometricSyncIntervalMinutes ?? 15}
                    onChange={(e) =>
                      setAttendanceConfig({
                        ...attendanceConfig,
                        biometricSyncIntervalMinutes: Number(e.target.value),
                      })
                    }
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                    Default Shift Schedule Name
                  </label>
                  <input
                    type="text"
                    value={attendanceConfig.defaultShift || ''}
                    onChange={(e) => setAttendanceConfig({ ...attendanceConfig, defaultShift: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                    Custom Shift Logging Template Tag
                  </label>
                  <input
                    type="text"
                    value={attendanceConfig.customLoggingTemplate || ''}
                    onChange={(e) =>
                      setAttendanceConfig({ ...attendanceConfig, customLoggingTemplate: e.target.value })
                    }
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Checkbox Policy Toggles */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
              <span className="font-bold text-slate-900 dark:text-white uppercase text-[11px] tracking-wider block">
                3. Verification & Lunch Policies
              </span>

              <div className="space-y-2.5">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={attendanceConfig.autoDeductLunchBreak}
                    onChange={(e) =>
                      setAttendanceConfig({ ...attendanceConfig, autoDeductLunchBreak: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-indigo-600"
                  />
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                      Auto-Deduct {attendanceConfig.lunchBreakMinutes ?? 60}-Minute Lunch Break from Daily Shift Calculation
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Calculates net worked hours dynamically based on configured lunch break duration ({attendanceConfig.lunchBreakMinutes ?? 60} mins).
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={attendanceConfig.requireGeoLocation}
                    onChange={(e) =>
                      setAttendanceConfig({ ...attendanceConfig, requireGeoLocation: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-indigo-600"
                  />
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                      Require Geo-Fencing & Office Location Verification
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Enforces GPS perimeter matching during mobile clock-ins.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition cursor-pointer"
              >
                Save Shift Configuration & Templates
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. LEAVE REQUESTS SUBTAB                                                 */}
      {/* ========================================================================= */}
      {subTab === 'leave' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Employee Leave Management</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">PTO, Sick leave, and Parental leaves with manager approval flow</p>
            </div>
            <button
              onClick={() => setShowLeaveModal(true)}
              className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition cursor-pointer"
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

                {req.status === 'PENDING' && (isHRorAdmin || currentUser.role === 'DEPARTMENT_HEAD') && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleLeaveStatus(req.id, 'APPROVED')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => handleLeaveStatus(req.id, 'REJECTED')}
                      className="px-3 py-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
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

      {/* ========================================================================= */}
      {/* 6. PAYROLL PROCESSING ENGINE SUBTAB                                       */}
      {/* ========================================================================= */}
      {subTab === 'payroll' && currentPeriod && (
        <div className="space-y-6">
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
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 shadow-md shadow-emerald-600/30 transition cursor-pointer"
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
                <span className="text-xs text-slate-500 dark:text-slate-400">Net Employee Disbursement</span>
                <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                  {formatCurrency(currentPeriod.totalNet)}
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">Credits #1010 Operating Cash</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="w-full overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs min-w-[850px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 font-semibold">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4 text-right">Base Salary</th>
                    <th className="py-3 px-4 text-right">Allowances</th>
                    <th className="py-3 px-4 text-right">Gross Total</th>
                    <th className="py-3 px-4 text-right">Tax Deduction</th>
                    <th className="py-3 px-4 text-right">Pension</th>
                    <th className="py-3 px-4 text-right">Net Payout</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                  {currentPeriod.records.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 text-slate-800 dark:text-slate-200">
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">{rec.employeeName}</td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{rec.department}</td>
                      <td className="py-3 px-4 text-right font-mono">{formatCurrency(rec.baseSalary)}</td>
                      <td className="py-3 px-4 text-right font-mono">{formatCurrency(rec.allowances)}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {formatCurrency(rec.grossSalary)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-amber-700 dark:text-amber-400">
                        -{formatCurrency(rec.taxDeduction)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-amber-700 dark:text-amber-400">
                        -{formatCurrency(rec.pensionDeduction)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        {formatCurrency(rec.netSalary)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* UNIVERSAL MODALS (All using Modal component with backdrop & Esc closure)   */}
      {/* ========================================================================= */}

      {/* 1. REGISTER NEW EMPLOYEE MODAL */}
      <Modal
        isOpen={showAddEmpModal}
        onClose={() => setShowAddEmpModal(false)}
        title="Register New Employee"
        subtitle="Onboard enterprise staff with compensation rates and statutory deductions"
        maxWidth="2xl"
      >
        <form onSubmit={handleAddEmployee} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">First Name *</label>
              <input
                type="text"
                required
                value={newEmpData.firstName || ''}
                onChange={(e) => setNewEmpData({ ...newEmpData, firstName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Last Name *</label>
              <input
                type="text"
                required
                value={newEmpData.lastName || ''}
                onChange={(e) => setNewEmpData({ ...newEmpData, lastName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Work Email *</label>
              <input
                type="email"
                required
                value={newEmpData.email || ''}
                onChange={(e) => setNewEmpData({ ...newEmpData, email: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
              <input
                type="text"
                value={newEmpData.phone || ''}
                onChange={(e) => setNewEmpData({ ...newEmpData, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Department *</label>
              <select
                value={newEmpData.department || (departments[0]?.name || '')}
                onChange={(e) => setNewEmpData({ ...newEmpData, department: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Job Title *</label>
              <input
                type="text"
                required
                value={newEmpData.jobTitle || ''}
                onChange={(e) => setNewEmpData({ ...newEmpData, jobTitle: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Base Monthly Salary ($) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={newEmpData.baseSalaryMonthly || '0.00'}
                onChange={(e) => setNewEmpData({ ...newEmpData, baseSalaryMonthly: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Monthly Allowances ($)</label>
              <input
                type="number"
                step="0.01"
                value={newEmpData.allowances || '0.00'}
                onChange={(e) => setNewEmpData({ ...newEmpData, allowances: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Tax Withholding Rate (%)</label>
              <input
                type="number"
                value={newEmpData.taxDeductionRate || '0'}
                onChange={(e) => setNewEmpData({ ...newEmpData, taxDeductionRate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Pension Withholding Rate (%)</label>
              <input
                type="number"
                value={newEmpData.pensionRate || '0'}
                onChange={(e) => setNewEmpData({ ...newEmpData, pensionRate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowAddEmpModal(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md shadow-indigo-600/30 cursor-pointer"
            >
              Register Employee Record
            </button>
          </div>
        </form>
      </Modal>

      {/* 2. EDIT EMPLOYEE MODAL */}
      <Modal
        isOpen={!!editingEmployee}
        onClose={() => setEditingEmployee(null)}
        title={editingEmployee ? `Edit Profile: ${editingEmployee.firstName} ${editingEmployee.lastName}` : 'Edit Employee'}
        subtitle={`Employee ID: ${editingEmployee?.employeeCode} • RBAC Restricted to HR & Super Admin`}
        maxWidth="2xl"
      >
        <form onSubmit={handleUpdateEmployee} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">First Name *</label>
              <input
                type="text"
                required
                value={editEmpData.firstName || ''}
                onChange={(e) => setEditEmpData({ ...editEmpData, firstName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Last Name *</label>
              <input
                type="text"
                required
                value={editEmpData.lastName || ''}
                onChange={(e) => setEditEmpData({ ...editEmpData, lastName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Work Email *</label>
              <input
                type="email"
                required
                value={editEmpData.email || ''}
                onChange={(e) => setEditEmpData({ ...editEmpData, email: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
              <input
                type="text"
                value={editEmpData.phone || ''}
                onChange={(e) => setEditEmpData({ ...editEmpData, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Department</label>
              <select
                value={editEmpData.department || departments[0]?.name}
                onChange={(e) => setEditEmpData({ ...editEmpData, department: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Job Title</label>
              <input
                type="text"
                required
                value={editEmpData.jobTitle || ''}
                onChange={(e) => setEditEmpData({ ...editEmpData, jobTitle: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Employment Status</label>
              <select
                value={editEmpData.status || 'ACTIVE'}
                onChange={(e) => setEditEmpData({ ...editEmpData, status: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="ON_LEAVE">ON_LEAVE</option>
                <option value="PROBATION">PROBATION</option>
                <option value="TERMINATED">TERMINATED</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Base Monthly Salary ($)</label>
              <input
                type="number"
                step="0.01"
                required
                value={editEmpData.baseSalaryMonthly || '0.00'}
                onChange={(e) => setEditEmpData({ ...editEmpData, baseSalaryMonthly: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Monthly Allowances ($)</label>
              <input
                type="number"
                step="0.01"
                value={editEmpData.allowances || '0.00'}
                onChange={(e) => setEditEmpData({ ...editEmpData, allowances: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Tax Withholding Rate (%)</label>
              <input
                type="number"
                value={editEmpData.taxDeductionRate || '0'}
                onChange={(e) => setEditEmpData({ ...editEmpData, taxDeductionRate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Pension Withholding Rate (%)</label>
              <input
                type="number"
                value={editEmpData.pensionRate || '0'}
                onChange={(e) => setEditEmpData({ ...editEmpData, pensionRate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setEditingEmployee(null)}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md shadow-indigo-600/30 cursor-pointer"
            >
              Update Employee Profile
            </button>
          </div>
        </form>
      </Modal>

      {/* 3. DELETE EMPLOYEE CONFIRM MODAL */}
      <Modal
        isOpen={!!showDeleteEmpConfirm}
        onClose={() => setShowDeleteEmpConfirm(null)}
        title="Confirm Employee De-registration"
        subtitle="This action will terminate and archive the employee record from active payroll cycles"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600 dark:text-slate-300">
            Are you sure you want to terminate or remove this employee record? Historical General Ledger and payslip records will be preserved for statutory audit compliance.
          </p>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setShowDeleteEmpConfirm(null)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteEmployee}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer"
            >
              Confirm Deletion
            </button>
          </div>
        </div>
      </Modal>

      {/* 4. MANUAL HR ATTENDANCE SIGN-IN MODAL (With Smart Duplicate Detection) */}
      <Modal
        isOpen={showManualAttendanceModal}
        onClose={() => setShowManualAttendanceModal(false)}
        title="Manual Attendance Entry (HR Exclusive)"
        subtitle="Record or correct sign-in times with automatic cross-checking against biometric terminals"
        maxWidth="lg"
      >
        <form onSubmit={handleManualAttendanceSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Select Employee *</label>
            <select
              value={manualAttEmployeeId || (employees[0]?.id || '')}
              onChange={(e) => setManualAttEmployeeId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.firstName} {e.lastName} ({e.department} - {e.employeeCode})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Date *</label>
              <input
                type="date"
                required
                value={manualAttDate || ''}
                onChange={(e) => setManualAttDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Shift Status *</label>
              <select
                value={manualAttStatus || 'PRESENT'}
                onChange={(e) => setManualAttStatus(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              >
                <option value="PRESENT">PRESENT (Standard)</option>
                <option value="LATE">LATE (Exceeded Grace Period)</option>
                <option value="HALF_DAY">HALF_DAY (Partial Shift)</option>
                <option value="ABSENT">ABSENT (Unexcused)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Clock-In Time</label>
              <input
                type="text"
                required
                value={manualAttClockIn || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setManualAttClockIn(val);
                  setManualAttHours(hrmEngine.calculateNetWorkedHours(val, manualAttClockOut));
                }}
                placeholder="e.g. 09:00 AM"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Clock-Out Time</label>
              <input
                type="text"
                value={manualAttClockOut || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setManualAttClockOut(val);
                  setManualAttHours(hrmEngine.calculateNetWorkedHours(manualAttClockIn, val));
                }}
                placeholder="e.g. 05:00 PM"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">Net Worked Hours</label>
                <button
                  type="button"
                  onClick={() =>
                    setManualAttHours(hrmEngine.calculateNetWorkedHours(manualAttClockIn, manualAttClockOut))
                  }
                  className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  title="Recalculate using shift parameters"
                >
                  Auto-Calculate
                </button>
              </div>
              <input
                type="text"
                value={manualAttHours || ''}
                onChange={(e) => setManualAttHours(e.target.value)}
                placeholder="e.g. 07:50:00"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold"
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-[11px] text-indigo-900 dark:text-indigo-200 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>Smart duplicate detection active for {manualAttDate}.</span>
            </div>
            <span className="font-mono font-semibold text-indigo-700 dark:text-indigo-300 shrink-0">
              Net Shift: {manualAttHours} ({attendanceConfig.autoDeductLunchBreak ? `${attendanceConfig.lunchBreakMinutes ?? 60}m lunch deducted` : 'No lunch deducted'})
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowManualAttendanceModal(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md shadow-indigo-600/30 cursor-pointer"
            >
              Post Attendance Record
            </button>
          </div>
        </form>
      </Modal>

      {/* 5. CREATE DEPARTMENT MODAL (With HOD Role Assignment & Approval Privileges) */}
      <Modal
        isOpen={showAddDeptModal}
        onClose={() => setShowAddDeptModal(false)}
        title="Create Operational Department"
        subtitle="Define hierarchy, assign Head of Department (HOD) leaders, and configure review privileges"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateDepartment} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Dept Code (e.g. FIN) *</label>
              <input
                type="text"
                required
                maxLength={6}
                value={newDeptData.code || ''}
                onChange={(e) => setNewDeptData({ ...newDeptData, code: e.target.value.toUpperCase() })}
                placeholder="ENG"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono uppercase"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Department Name *</label>
              <input
                type="text"
                required
                value={newDeptData.name || ''}
                onChange={(e) => setNewDeptData({ ...newDeptData, name: e.target.value })}
                placeholder="e.g. Product Strategy & Innovation"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Department Description</label>
            <textarea
              rows={2}
              value={newDeptData.description || ''}
              onChange={(e) => setNewDeptData({ ...newDeptData, description: e.target.value })}
              placeholder="Scope of work, core functions, and deliverables..."
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Head of Department (HOD) *</label>
              <select
                value={newDeptData.headOfDepartmentId || (employees[0]?.id || '')}
                onChange={(e) => setNewDeptData({ ...newDeptData, headOfDepartmentId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              >
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.firstName} {e.lastName} ({e.jobTitle})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Annual Budget ($) *</label>
              <input
                type="number"
                step="1000"
                required
                value={newDeptData.budgetAnnual || '0.00'}
                onChange={(e) => setNewDeptData({ ...newDeptData, budgetAnnual: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>

          {/* Standard Organizational Approval Privileges */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 dark:text-slate-200 block text-[11px] uppercase tracking-wider">
                Enterprise HOD Approval Privileges (8 Configurable Rights)
              </span>
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                {newDeptData.approvalPrivileges.length} Assigned
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {STANDARD_HOD_PRIVILEGES.map((priv) => {
                const checked = newDeptData.approvalPrivileges.includes(priv.id);
                return (
                  <label
                    key={priv.id}
                    className={`flex items-start gap-2.5 p-2 rounded-lg border transition cursor-pointer ${
                      checked
                        ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewDeptData({
                            ...newDeptData,
                            approvalPrivileges: [...newDeptData.approvalPrivileges, priv.id],
                          });
                        } else {
                          setNewDeptData({
                            ...newDeptData,
                            approvalPrivileges: newDeptData.approvalPrivileges.filter((x) => x !== priv.id),
                          });
                        }
                      }}
                      className="w-4 h-4 rounded text-indigo-600 mt-0.5 shrink-0"
                    />
                    <div className="min-w-0">
                      <span className="font-semibold block text-xs">{priv.label}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                        {priv.description}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowAddDeptModal(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md shadow-indigo-600/30 cursor-pointer"
            >
              Create Department
            </button>
          </div>
        </form>
      </Modal>

      {/* 6. EDIT DEPARTMENT MODAL */}
      <Modal
        isOpen={!!editingDept}
        onClose={() => setEditingDept(null)}
        title={editingDept ? `Edit Department: ${editingDept.name}` : 'Edit Department'}
        subtitle="Update department metadata, annual budget allocation, and assigned Head of Department"
        maxWidth="lg"
      >
        <form onSubmit={handleUpdateDepartment} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Dept Code *</label>
              <input
                type="text"
                required
                maxLength={6}
                value={editDeptData.code || ''}
                onChange={(e) => setEditDeptData({ ...editDeptData, code: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono uppercase"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Department Name *</label>
              <input
                type="text"
                required
                value={editDeptData.name || ''}
                onChange={(e) => setEditDeptData({ ...editDeptData, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Description</label>
            <textarea
              rows={2}
              value={editDeptData.description || ''}
              onChange={(e) => setEditDeptData({ ...editDeptData, description: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Head of Department (HOD)</label>
              <select
                value={editDeptData.headOfDepartmentId || ''}
                onChange={(e) => setEditDeptData({ ...editDeptData, headOfDepartmentId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              >
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.firstName} {e.lastName} ({e.jobTitle})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Annual Budget ($)</label>
              <input
                type="number"
                step="1000"
                value={editDeptData.budgetAnnual || '0.00'}
                onChange={(e) => setEditDeptData({ ...editDeptData, budgetAnnual: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>

          {/* Standard Organizational Approval Privileges */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 dark:text-slate-200 block text-[11px] uppercase tracking-wider">
                Assigned HOD Approval Privileges (8 Configurable Rights)
              </span>
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                {(editDeptData.approvalPrivileges || []).length} Assigned
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {STANDARD_HOD_PRIVILEGES.map((priv) => {
                const currentPrivs = editDeptData.approvalPrivileges || [];
                const checked = currentPrivs.includes(priv.id);
                return (
                  <label
                    key={priv.id}
                    className={`flex items-start gap-2.5 p-2 rounded-lg border transition cursor-pointer ${
                      checked
                        ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setEditDeptData({
                            ...editDeptData,
                            approvalPrivileges: [...currentPrivs, priv.id],
                          });
                        } else {
                          setEditDeptData({
                            ...editDeptData,
                            approvalPrivileges: currentPrivs.filter((x) => x !== priv.id),
                          });
                        }
                      }}
                      className="w-4 h-4 rounded text-indigo-600 mt-0.5 shrink-0"
                    />
                    <div className="min-w-0">
                      <span className="font-semibold block text-xs">{priv.label}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                        {priv.description}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setEditingDept(null)}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md shadow-indigo-600/30 cursor-pointer"
            >
              Save Department Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* 7. DELETE DEPARTMENT CONFIRM MODAL */}
      <Modal
        isOpen={!!showDeleteDeptConfirm}
        onClose={() => setShowDeleteDeptConfirm(null)}
        title="Confirm Department Deletion"
        subtitle="This action will permanently remove the department from organizational records"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600 dark:text-slate-300">
            Are you sure you want to remove this department? Any personnel assigned to this department will retain their employee profiles and may be reassigned.
          </p>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setShowDeleteDeptConfirm(null)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteDepartment}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer"
            >
              Delete Department
            </button>
          </div>
        </div>
      </Modal>

      {/* 8. SUBMIT LEAVE REQUEST MODAL */}
      <Modal
        isOpen={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        title="Submit Staff Leave Request"
        subtitle="Request PTO, sick leave, or parental time off for management review"
        maxWidth="md"
      >
        <form onSubmit={handleSubmitLeave} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Employee *</label>
            <select
              value={leaveEmployeeId || (employees[0]?.id || '')}
              onChange={(e) => setLeaveEmployeeId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.firstName} {e.lastName} ({e.department})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Leave Type *</label>
            <select
              value={leaveType || 'ANNUAL'}
              onChange={(e) => setLeaveType(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
            >
              <option value="ANNUAL">Annual Leave / Vacation</option>
              <option value="SICK">Sick Leave</option>
              <option value="MATERNITY">Parental / Maternity</option>
              <option value="UNPAID">Unpaid Leave</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Start Date *</label>
              <input
                type="date"
                required
                value={leaveStartDate || ''}
                onChange={(e) => setLeaveStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">End Date *</label>
              <input
                type="date"
                required
                value={leaveEndDate || ''}
                onChange={(e) => setLeaveEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Total Days *</label>
            <input
              type="number"
              min="1"
              required
              value={leaveDays ?? 1}
              onChange={(e) => setLeaveDays(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Reason / Notes *</label>
            <textarea
              rows={2}
              required
              value={leaveReason || ''}
              onChange={(e) => setLeaveReason(e.target.value)}
              placeholder="Reason for leave..."
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowLeaveModal(false)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold cursor-pointer"
            >
              Submit Request
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
