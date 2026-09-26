import React, { useState, useEffect } from 'react';
import {
  Search,
  Receipt,
  FileText,
  Users,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Building,
  DollarSign,
  PlusCircle,
  Camera,
} from 'lucide-react';
import { glEngine } from '../domains/accounting/gl-engine';
import { hrmEngine } from '../domains/hrm/hrm-engine';
import { receiptExpenseEngine } from '../domains/accounting/receipt-engine';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string, subTab?: string) => void;
  onQuickSnap?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onQuickSnap,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery('');
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const employees = hrmEngine.getEmployees();
  const invoices = glEngine.getInvoices();
  const receipts = receiptExpenseEngine.getReceipts();

  const q = query.toLowerCase().trim();

  const actions = [
    {
      id: 'snap-receipt',
      title: 'Snap & Submit Receipt on the Go',
      subtitle: 'Activate mobile camera or upload expense voucher',
      category: 'Quick Actions',
      icon: Camera,
      action: () => {
        onNavigate('receipts');
        if (onQuickSnap) onQuickSnap();
        onClose();
      },
    },
    {
      id: 'nav-dashboard',
      title: 'Go to Executive Dashboard Overview',
      subtitle: 'View real-time financial KPIs, runway, and headcount',
      category: 'Navigation',
      icon: Layers,
      action: () => {
        onNavigate('dashboard');
        onClose();
      },
    },
    {
      id: 'nav-receipts',
      title: 'Go to Receipts & Daily Expenses',
      subtitle: 'Employee operational slips, petty cash, and Gemini auto-auditing',
      category: 'Navigation',
      icon: Receipt,
      action: () => {
        onNavigate('receipts');
        onClose();
      },
    },
    {
      id: 'nav-accounting',
      title: 'Go to General Ledger & Financial Reports',
      subtitle: 'Double-entry journals, Chart of Accounts, P&L, Balance Sheet',
      category: 'Navigation',
      icon: DollarSign,
      action: () => {
        onNavigate('accounting', 'journal');
        onClose();
      },
    },
    {
      id: 'nav-ap-aging',
      title: 'Go to Accounts Payable (AP) & 30/60/90 Aging',
      subtitle: 'Vendor liability matrix and supplier disbursement schedule',
      category: 'Navigation',
      icon: Building,
      action: () => {
        onNavigate('accounting', 'ap');
        onClose();
      },
    },
    {
      id: 'nav-invoices',
      title: 'Go to AI Invoice OCR Audit',
      subtitle: 'Gemini 3.8 Flash multi-line vendor invoice scanner',
      category: 'Navigation',
      icon: FileText,
      action: () => {
        onNavigate('ai-invoice');
        onClose();
      },
    },
    {
      id: 'nav-hrm',
      title: 'Go to HRM & Workforce Directory',
      subtitle: 'Staff Directory, employee onboarding & offboarding',
      category: 'Navigation',
      icon: Users,
      action: () => {
        onNavigate('hrm', 'employees');
        onClose();
      },
    },
    {
      id: 'nav-hrm-attendance',
      title: 'Go to Attendance Logs & Shift Schedules',
      subtitle: 'Daily biometric clock-in logs and shift configuration',
      category: 'Navigation',
      icon: Users,
      action: () => {
        onNavigate('hrm', 'attendance');
        onClose();
      },
    },
    {
      id: 'nav-hrm-leave',
      title: 'Go to Leave Requests & Approvals',
      subtitle: 'Employee PTO, sick leave, and manager approvals',
      category: 'Navigation',
      icon: Users,
      action: () => {
        onNavigate('hrm', 'leave');
        onClose();
      },
    },
    {
      id: 'nav-hrm-payroll',
      title: 'Go to Payroll Engine & Payslips',
      subtitle: 'Monthly salary calculation, tax withholdings, and GL posting',
      category: 'Navigation',
      icon: Users,
      action: () => {
        onNavigate('hrm', 'payroll');
        onClose();
      },
    },
    {
      id: 'nav-providers',
      title: 'Go to Provider Factory & Tech Stack',
      subtitle: 'Switch Neon Postgres, S3, Gemini, or Kafka providers',
      category: 'Navigation',
      icon: Sparkles,
      action: () => {
        onNavigate('settings', 'providers');
        onClose();
      },
    },
    {
      id: 'nav-settings-brand',
      title: 'System Theme & Corporate Brand Customization',
      subtitle: 'Light/Dark mode toggle, system name, and master corporate logo',
      category: 'System & Settings',
      icon: Layers,
      action: () => {
        onNavigate('settings', 'brand');
        onClose();
      },
    },
    {
      id: 'nav-settings-profile',
      title: 'User Account & Profile Settings',
      subtitle: 'Profile photo, work email, credentials, and notification settings',
      category: 'System & Settings',
      icon: Users,
      action: () => {
        onNavigate('settings', 'profile');
        onClose();
      },
    },
    {
      id: 'nav-settings-directory',
      title: 'Enterprise Directory & Active Directory User Groups',
      subtitle: 'Active Directory style user directory, organizational units, and RBAC policies',
      category: 'System & Settings',
      icon: ShieldCheck,
      action: () => {
        onNavigate('settings', 'directory');
        onClose();
      },
    },
  ];

  const filteredActions = actions.filter(
    (a) =>
      !q ||
      a.title.toLowerCase().includes(q) ||
      a.subtitle.toLowerCase().includes(q) ||
      a.category.toLowerCase().includes(q)
  );

  const matchedEmployees = q
    ? employees.filter(
        (e) =>
          e.firstName.toLowerCase().includes(q) ||
          e.lastName.toLowerCase().includes(q) ||
          e.jobTitle.toLowerCase().includes(q) ||
          e.department.toLowerCase().includes(q)
      )
    : [];

  const matchedInvoices = q
    ? invoices.filter(
        (i) =>
          i.vendorName.toLowerCase().includes(q) ||
          i.invoiceNumber.toLowerCase().includes(q) ||
          i.poNumber?.toLowerCase().includes(q)
      )
    : [];

  const matchedReceipts = q
    ? receipts.filter(
        (r) =>
          r.merchantName.toLowerCase().includes(q) ||
          r.claimNumber.toLowerCase().includes(q) ||
          r.employeeName.toLowerCase().includes(q)
      )
    : [];

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 bg-slate-900/50 dark:bg-black/80 backdrop-blur-sm z-50 flex items-start justify-center pt-20 p-4 animate-in fade-in duration-150 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] cursor-default"
      >
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-indigo-500 dark:text-indigo-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query || ''}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search views, actions, staff, receipts, invoices... (Press ESC to close)"
            className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
          />
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded border border-slate-200 dark:border-slate-700">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Quick Actions & Navigation */}
          {filteredActions.length > 0 && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3 py-1">
                Workspace Views & Actions
              </div>
              <div className="space-y-1">
                {filteredActions.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={item.action}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition flex items-center justify-center">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300">
                            {item.title}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">{item.subtitle}</div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition transform group-hover:translate-x-1" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Matched Receipts */}
          {matchedReceipts.length > 0 && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3 py-1">
                Receipts & Operational Claims
              </div>
              <div className="space-y-1">
                {matchedReceipts.slice(0, 3).map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      onNavigate('receipts');
                      onClose();
                    }}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                        <Receipt className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-900 dark:text-white">{r.merchantName}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Claim #{r.claimNumber} • {r.employeeName} • ${r.totalAmount}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {r.status}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Matched Invoices */}
          {matchedInvoices.length > 0 && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3 py-1">
                Vendor Invoices
              </div>
              <div className="space-y-1">
                {matchedInvoices.slice(0, 3).map((inv) => (
                  <button
                    key={inv.id}
                    onClick={() => {
                      onNavigate('accounting', 'ap');
                      onClose();
                    }}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-900 dark:text-white">{inv.vendorName}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Invoice #{inv.invoiceNumber} • ${inv.totalAmount}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {inv.status}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Matched Staff */}
          {matchedEmployees.length > 0 && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3 py-1">
                Employees & Staff
              </div>
              <div className="space-y-1">
                {matchedEmployees.slice(0, 3).map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => {
                      onNavigate('hrm');
                      onClose();
                    }}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                        {emp.firstName[0]}
                        {emp.lastName[0]}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-900 dark:text-white">
                          {emp.firstName} {emp.lastName}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {emp.jobTitle} • {emp.department}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-semibold">View HR Profile</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredActions.length === 0 &&
            matchedReceipts.length === 0 &&
            matchedInvoices.length === 0 &&
            matchedEmployees.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400 space-y-1">
                <div>No matching workspace items found for "{query}".</div>
                <div className="text-slate-400 dark:text-slate-500">Try searching "receipt", "invoice", "payroll", or "fuel".</div>
              </div>
            )}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <span>Navigate with arrow keys • Enter to select</span>
          <span>AUDMA OS Omnibox</span>
        </div>
      </div>
    </div>
  );
};
