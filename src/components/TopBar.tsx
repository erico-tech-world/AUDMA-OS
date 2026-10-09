import React, { useState } from 'react';
import {
  Search,
  Plus,
  Bell,
  Sparkles,
  Database,
  Building2,
  ChevronDown,
  Camera,
  FileText,
  Users,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Menu,
  Sun,
  Moon,
} from 'lucide-react';
import { UserSession } from '../types';
import { ProviderFactory } from '../providers/factory';
import { receiptExpenseEngine } from '../domains/accounting/receipt-engine';
import { glEngine } from '../domains/accounting/gl-engine';
import { hrmEngine } from '../domains/hrm/hrm-engine';
import { useTheme } from '../domains/core/theme-context';

interface TopBarProps {
  currentUser: UserSession;
  activeTab: string;
  activeSubTab?: string;
  onNavigate: (tab: string, subTab?: string) => void;
  onOpenCommandPalette: () => void;
  onToggleSidebar?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentUser,
  activeTab,
  activeSubTab,
  onNavigate,
  onOpenCommandPalette,
  onToggleSidebar,
}) => {
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { theme, toggleTheme } = useTheme();

  // Close popovers on Escape or outside click
  React.useEffect(() => {
    if (!showQuickMenu && !showNotifications) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowQuickMenu(false);
        setShowNotifications(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showQuickMenu, showNotifications]);

  const factory = ProviderFactory.getInstance();
  const config = factory.getConfig();

  const pendingReceipts = receiptExpenseEngine.getSummaryMetrics().pendingCount;
  const pendingInvoices = glEngine.getInvoices().filter((i) => i.status === 'PENDING_AUDIT').length;
  const pendingLeaves = hrmEngine.getLeaveRequests().filter((l) => l.status === 'PENDING').length;
  const totalAlerts = pendingReceipts + pendingInvoices + pendingLeaves;

  // Breadcrumbs title helper
  const getBreadcrumbTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Executive Overview';
      case 'receipts':
        return 'Receipts & Daily Expenses';
      case 'accounting':
        if (activeSubTab === 'coa') return 'General Ledger > Chart of Accounts';
        if (activeSubTab === 'reports') return 'General Ledger > Financial Statements';
        if (activeSubTab === 'ap') return 'General Ledger > Accounts Payable & 30/60/90 Aging';
        return 'General Ledger > Journal Ledger';
      case 'ai-invoice':
        return 'AI Invoice OCR Audit';
      case 'hrm':
        return 'Human Resource Management & Payroll';
      case 'providers':
        return 'Pluggable Architecture & Providers';
      case 'settings':
        if (activeSubTab === 'brand') return 'System & Settings > Theme & Brand Customization';
        if (activeSubTab === 'profile') return 'System & Settings > User Account & Profile';
        if (activeSubTab === 'directory') return 'System & Settings > Enterprise User Directory & Groups';
        if (activeSubTab === 'providers') return 'System & Settings > Infrastructure Adapters';
        return 'System & Settings';
      default:
        return 'Dashboard';
    }
  };

  return (
    <header className="h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between gap-4 sticky top-0 z-30">
      {/* Invisible dismiss backdrop for open popovers */}
      {(showQuickMenu || showNotifications) && (
        <div
          className="fixed inset-0 z-40 bg-transparent"
          onClick={() => {
            setShowQuickMenu(false);
            setShowNotifications(false);
          }}
          aria-hidden="true"
        />
      )}

      {/* Left: Mobile Drawer Trigger & Breadcrumbs with guaranteed spacing */}
      <div className="flex items-center gap-3 shrink-0 min-w-0">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition min-h-[44px] min-w-[44px] flex items-center justify-center border border-slate-200 dark:border-slate-700/60 shrink-0"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-2 text-xs truncate">
          <span className="text-slate-400 hidden xl:inline">AUDMA OS</span>
          <span className="text-slate-300 dark:text-slate-600 hidden xl:inline">/</span>
          <span className="font-semibold text-slate-900 dark:text-white truncate text-xs sm:text-sm">{getBreadcrumbTitle()}</span>
        </div>

        {/* Active Organization pill (Desktop only) */}
        <div className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 text-[11px] shrink-0">
          <Building2 className="w-3 h-3 text-indigo-500 dark:text-indigo-400" />
          <span>Apex Global Holdings</span>
        </div>
      </div>

      {/* Center: Global Search Bar trigger (Cmd + K) - Desktop only (>=1024px) */}
      <div className="flex-1 max-w-md mx-4 hidden lg:block">
        <button
          onClick={onOpenCommandPalette}
          className="w-full flex items-center justify-between px-3.5 py-2 min-h-[40px] rounded-xl bg-slate-100 dark:bg-slate-800/70 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition group shadow-inner"
        >
          <div className="flex items-center gap-2.5 truncate">
            <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 transition" />
            <span className="truncate">Search transactions, receipts, accounts, staff...</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-mono text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700/80">
            <span>⌘</span>
            <span>K</span>
          </div>
        </button>
      </div>

      {/* Right: Search button on Mobile/Tablet (<1024px), Quick Action, Provider Status, Notifications */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Mobile/Tablet (<1024px) Search Icon Button */}
        <button
          onClick={onOpenCommandPalette}
          className="lg:hidden p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 transition min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0 shadow-sm"
          title="Search transactions (Cmd+K)"
          aria-label="Search transactions"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Active Engine Badges (Desktop only) */}
        <div className="hidden 2xl:flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 font-mono text-[11px]">
            <Database className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
            <span>Neon Postgres</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 font-mono text-[11px]">
            <Sparkles className="w-3 h-3 text-purple-600 dark:text-purple-400" />
            <span>Multi-LLM Active</span>
          </div>
        </div>

        {/* Dark / Light Theme Mode Switcher Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-800 dark:text-slate-300 dark:hover:text-white dark:border-slate-700/80 border transition min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer shadow-sm"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          aria-label="Toggle color theme"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-600" />
          )}
        </button>

        {/* Quick Action Button & Popover */}
        <div className="relative">
          <button
            onClick={() => setShowQuickMenu(!showQuickMenu)}
            className="px-3 py-2 min-h-[40px] rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 flex items-center gap-1.5 transition"
            aria-label="Open quick actions"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Quick Action</span>
            <ChevronDown className="w-3 h-3" />
          </button>

          {showQuickMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-1.5 z-50 text-xs space-y-1 animate-in fade-in slide-in-from-top-2">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                Create & Capture
              </div>
              <button
                onClick={() => {
                  onNavigate('receipts', 'capture');
                  setShowQuickMenu(false);
                }}
                className="w-full text-left p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center gap-3 transition min-h-[44px]"
              >
                <div className="p-2 rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">Snap & Submit Receipt</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Live mobile slip OCR & GL auto-map</div>
                </div>
              </button>

              <button
                onClick={() => {
                  onNavigate('ai-invoice');
                  setShowQuickMenu(false);
                }}
                className="w-full text-left p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center gap-3 transition min-h-[44px]"
              >
                <div className="p-2 rounded-lg bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-400">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">Scan Vendor Invoice</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Multi-item AP bill audit</div>
                </div>
              </button>

              <button
                onClick={() => {
                  onNavigate('accounting', 'journal');
                  setShowQuickMenu(false);
                }}
                className="w-full text-left p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center gap-3 transition min-h-[44px]"
              >
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">Post Journal Entry</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Double-entry ledger debit/credit</div>
                </div>
              </button>

              <button
                onClick={() => {
                  onNavigate('hrm', 'employees');
                  setShowQuickMenu(false);
                }}
                className="w-full text-left p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center gap-3 transition min-h-[44px]"
              >
                <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">Add New Employee</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">HR record, payroll & compensation</div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800/80 dark:hover:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 transition relative min-h-[40px] min-w-[40px] flex items-center justify-center shadow-sm"
            title="Pending Approval Alerts"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {totalAlerts > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
                {totalAlerts}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-3 z-50 text-xs space-y-2 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="font-bold text-slate-900 dark:text-white text-xs">Action Center</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">{totalAlerts} Pending Approvals</span>
              </div>

              <div className="space-y-1.5">
                {pendingReceipts > 0 && (
                  <button
                    onClick={() => {
                      onNavigate('receipts', 'inbox');
                      setShowNotifications(false);
                    }}
                    className="w-full text-left p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between min-h-[44px]"
                  >
                    <div className="space-y-0.5">
                      <div className="font-semibold text-slate-900 dark:text-slate-200">{pendingReceipts} Expense Receipts</div>
                      <div className="text-[10px] text-amber-600 dark:text-amber-400">Awaiting Finance Auditor sign-off</div>
                    </div>
                    <span className="text-[10px] px-2 py-1 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-mono font-bold">
                      Review
                    </span>
                  </button>
                )}

                {pendingInvoices > 0 && (
                  <button
                    onClick={() => {
                      onNavigate('accounting', 'ap');
                      setShowNotifications(false);
                    }}
                    className="w-full text-left p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between min-h-[44px]"
                  >
                    <div className="space-y-0.5">
                      <div className="font-semibold text-slate-900 dark:text-slate-200">{pendingInvoices} Vendor Invoices</div>
                      <div className="text-[10px] text-cyan-600 dark:text-cyan-400">Ready for AP voucher posting</div>
                    </div>
                    <span className="text-[10px] px-2 py-1 rounded-md bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 font-mono font-bold">
                      Audit
                    </span>
                  </button>
                )}

                {pendingLeaves > 0 && (
                  <button
                    onClick={() => {
                      onNavigate('hrm', 'leave');
                      setShowNotifications(false);
                    }}
                    className="w-full text-left p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between min-h-[44px]"
                  >
                    <div className="space-y-0.5">
                      <div className="font-semibold text-slate-900 dark:text-slate-200">{pendingLeaves} Leave Requests</div>
                      <div className="text-[10px] text-indigo-600 dark:text-indigo-400">Staff time-off claims pending</div>
                    </div>
                    <span className="text-[10px] px-2 py-1 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 font-mono font-bold">
                      Approve
                    </span>
                  </button>
                )}

                {totalAlerts === 0 && (
                  <div className="p-4 text-center text-slate-500 dark:text-slate-400 text-xs">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 dark:text-emerald-400 mx-auto mb-1" />
                    <span>All workflows up to date!</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
