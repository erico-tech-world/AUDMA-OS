import React from 'react';
import {
  Users,
  DollarSign,
  TrendingUp,
  FileCheck2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Shield,
  Activity,
  Calendar,
  Sparkles,
  Zap,
  Building2,
} from 'lucide-react';
import { glEngine } from '../domains/accounting/gl-engine';
import { hrmEngine } from '../domains/hrm/hrm-engine';
import { coreAuthService } from '../domains/core/rbac';
import { formatCurrency, toDecimal } from '../lib/math';

interface DashboardViewProps {
  onNavigate: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const employees = hrmEngine.getEmployees();
  const attendance = hrmEngine.getAttendance();
  const leaveRequests = hrmEngine.getLeaveRequests();
  const payrollPeriods = hrmEngine.getPayrollPeriods();
  const accounts = glEngine.getAccounts();
  const invoices = glEngine.getInvoices();
  const auditLogs = coreAuthService.getAuditLogs().slice(0, 8);

  const activeEmployees = employees.filter((e) => e.status === 'ACTIVE').length;
  const pendingLeaves = leaveRequests.filter((l) => l.status === 'PENDING').length;

  const cashAccount = accounts.find((a) => a.code === '1010');
  const arAccount = accounts.find((a) => a.code === '1020');
  const apAccount = accounts.find((a) => a.code === '2010');

  const pnl = glEngine.generateProfitAndLoss();
  const pendingInvoices = invoices.filter((i) => i.status === 'PENDING_AUDIT');

  const latestPayroll = payrollPeriods[0];

  return (
    <div className="space-y-6">
      {/* Top Banner / System Monolith Status */}
      <div className="dashboard-hero bg-gradient-to-r from-slate-50 via-indigo-50/70 to-slate-50 border border-indigo-100/80 text-slate-900 dark:from-slate-900 dark:via-indigo-950 dark:to-slate-900 dark:border-slate-800 dark:text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30">
              <Zap className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
              <span>Decoupled Modular Monolith • BullMQ & Precision Math</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              AUDMA Enterprise Operating System
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Consolidated real-time operational cockpit synchronizing Human Resource Management
              with Double-Entry General Ledger accounting through universal provider factories.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              id="dash-btn-invoice-audit"
              onClick={() => onNavigate('ai-invoice')}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-md shadow-indigo-600/30 flex items-center gap-2 transition"
            >
              <Sparkles className="w-4 h-4" />
              <span>AI Invoice Audit</span>
            </button>
            <button
              id="dash-btn-run-payroll"
              onClick={() => onNavigate('hrm')}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-sm font-semibold flex items-center gap-2 transition dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700 shadow-sm"
            >
              <Calendar className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              <span>HRM & Payroll</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Treasury / Cash */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Operating Treasury (Bank)</span>
            <span className="p-2 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {formatCurrency(cashAccount?.currentBalance || '0')}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>GL Account #1010 Balanced</span>
            </div>
          </div>
        </div>

        {/* Operational Net Income */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Net Operating Income</span>
            <span className="p-2 rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {formatCurrency(pnl.netIncome)}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span>Revenue: {formatCurrency(pnl.totalRevenue)}</span>
            </div>
          </div>
        </div>

        {/* Accounts Payable Pending */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Accounts Payable (A/P)</span>
            <span className="p-2 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
              <FileCheck2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {formatCurrency(apAccount?.currentBalance || '0')}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
              <span>{pendingInvoices.length} Invoices Pending Verification</span>
            </div>
          </div>
        </div>

        {/* Active Headcount & Attendance */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Enterprise Headcount</span>
            <span className="p-2 rounded-lg bg-cyan-100 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {activeEmployees} Staff Members
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-cyan-600 dark:text-cyan-400">
              <Clock className="w-3.5 h-3.5" />
              <span>{attendance.length} Clocked in today</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Dual Columns: Financial Pulse + HRM Sync Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Financial & AP Aging Overview */}
        <div className="lg:col-span-2 space-y-6">
          {/* AP Invoices Pending Action */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Accounts Payable Invoices</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Extracted supplier invoices awaiting auditor sign-off and General Ledger posting
                </p>
              </div>
              <button
                onClick={() => onNavigate('accounting')}
                className="text-xs font-bold px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 shrink-0 shadow-sm transition"
              >
                <span>View Full AP</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800/80">
              {invoices.map((inv) => (
                <div key={inv.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-sm text-slate-900 dark:text-white tracking-tight">{inv.vendorName}</span>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-600 shadow-xs tracking-tight">
                        #{inv.invoiceNumber}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 flex flex-wrap items-center gap-3">
                      <span className="flex items-center gap-1.5">
                        <span className="font-medium text-slate-600 dark:text-slate-400">Due:</span>
                        <span className="font-bold text-slate-900 dark:text-white font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px] border border-slate-300 dark:border-slate-700">
                          {inv.dueDate}
                        </span>
                      </span>
                      <span className="text-slate-300 dark:text-slate-700">•</span>
                      <span className="flex items-center gap-1.5">
                        <span className="font-medium text-slate-600 dark:text-slate-400">Items:</span>
                        <span className="font-bold text-slate-900 dark:text-white font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px] border border-slate-300 dark:border-slate-700">
                          {inv.lineItems.length}
                        </span>
                      </span>
                      {inv.aiExtracted && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-800 dark:text-purple-200 bg-purple-100 dark:bg-purple-950/80 border border-purple-300 dark:border-purple-700 px-2 py-0.5 rounded-md shadow-xs">
                          <Sparkles className="w-3 h-3 text-purple-700 dark:text-purple-300" />
                          <span>AI Verified ({(inv.aiConfidence! * 100).toFixed(0)}%)</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-slate-900 dark:text-white font-mono">{formatCurrency(inv.totalAmount)}</div>
                    <span
                      className={`inline-block mt-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border shadow-xs ${
                        inv.status === 'POSTED_TO_GL'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-200 dark:border-emerald-700'
                          : inv.status === 'PAID'
                          ? 'bg-cyan-50 text-cyan-800 border-cyan-300 dark:bg-cyan-950/80 dark:text-cyan-200 dark:border-cyan-700'
                          : 'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-700'
                      }`}
                    >
                      {inv.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* HRM Monthly Payroll Summary Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">HRM Payroll Cycle</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{latestPayroll.periodName}</p>
              </div>
              <button
                onClick={() => onNavigate('hrm')}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition flex items-center gap-1.5 shrink-0 shadow-xs"
              >
                <span>Manage Payroll</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Total Gross Salary</span>
                <div className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                  {formatCurrency(latestPayroll.totalGross)}
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block font-mono">
                  Debits Expense (#5100)
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Withholdings & Pension</span>
                <div className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-1">
                  {formatCurrency(latestPayroll.totalDeductions)}
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block font-mono">
                  Credits Liabilities (#2100 / #2110)
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Net Treasury Payout</span>
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  {formatCurrency(latestPayroll.totalNet)}
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block font-mono">
                  Credits Bank Cash (#1010)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Event Stream & Audit Trail */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
                <Activity className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                <span>Cross-Domain Event Trail</span>
              </div>
              <span className="text-[10px] font-mono font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60">
                Live Monolith Bus
              </span>
            </div>

            <div className="mt-3 space-y-3">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition text-xs space-y-1"
                >
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span className="font-bold text-slate-900 dark:text-slate-200">{log.action}</span>
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-medium">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">{log.details}</p>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center justify-between pt-1">
                    <span>
                      By: <strong className="font-semibold text-slate-800 dark:text-slate-200">{log.actor}</strong>
                    </span>
                    <span
                      className={`font-mono text-[9px] uppercase px-1.5 py-0.5 rounded font-bold border ${
                        log.domain === 'ACCOUNTING'
                          ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800'
                          : log.domain === 'HRM'
                          ? 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/80 dark:text-purple-300 dark:border-purple-800'
                          : 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800'
                      }`}
                    >
                      {log.domain}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Architecture Spec Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-xs text-slate-700 dark:text-slate-300 space-y-2.5 shadow-sm">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold">
              <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Decoupled Monolith Guarantees</span>
            </div>
            <ul className="list-disc list-inside space-y-1.5 text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
              <li>Zero cross-domain foreign key joins in queries</li>
              <li>Asynchronous events bridge HRM payroll to GL postings</li>
              <li>Strict IEEE-754 precision math via Decimal.js</li>
              <li>Plug-and-play provider switching (Neon, R2, Gemini, BullMQ)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
