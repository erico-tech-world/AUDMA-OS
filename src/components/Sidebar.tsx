import React, { useState } from 'react';
import {
  Layers,
  LayoutDashboard,
  Receipt,
  DollarSign,
  FileText,
  Users,
  Cpu,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  Calendar,
  Building,
  Sparkles,
  CreditCard,
  Briefcase,
  Terminal,
  UserCheck,
  Clock,
  PieChart,
  Wand2,
  Shield,
  Sun,
  Moon,
  X,
  Settings,
  Palette,
  User,
} from 'lucide-react';
import { UserSession } from '../types';
import { DEFAULT_USERS, coreAuthService } from '../domains/core/rbac';
import { receiptExpenseEngine } from '../domains/accounting/receipt-engine';
import { useTheme } from '../domains/core/theme-context';

interface SidebarProps {
  currentUser: UserSession;
  onUserChange: (user: UserSession) => void;
  activeTab: string;
  activeSubTab?: string;
  onTabChange: (tab: string, subTab?: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenAuditModal: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  onUserChange,
  activeTab,
  activeSubTab,
  onTabChange,
  isCollapsed,
  onToggleCollapse,
  onOpenAuditModal,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  // Accordion Expand/Collapse States
  const [executiveOpen, setExecutiveOpen] = useState(true);
  const [financeOpen, setFinanceOpen] = useState(true);
  const [apOpen, setApOpen] = useState(true);
  const [aiHubOpen, setAiHubOpen] = useState(true);
  const [hrmOpen, setHrmOpen] = useState(true);
  const [systemOpen, setSystemOpen] = useState(false);

  // Nested HRM child accordion
  const [hrmEmployeesOpen, setHrmEmployeesOpen] = useState(true);
  const [hrmAttendanceOpen, setHrmAttendanceOpen] = useState(false);
  const [hrmLeavePayrollOpen, setHrmLeavePayrollOpen] = useState(false);
  const [receiptsSubOpen, setReceiptsSubOpen] = useState(true);

  // Bi-directional active state sync: auto-expand accordions to match activeTab and activeSubTab
  React.useEffect(() => {
    if (activeTab === 'dashboard') {
      setExecutiveOpen(true);
    } else if (activeTab === 'accounting') {
      if (activeSubTab === 'ap') {
        setApOpen(true);
      } else {
        setFinanceOpen(true);
      }
    } else if (activeTab === 'ai-invoice' || activeTab === 'receipts') {
      setAiHubOpen(true);
      if (activeTab === 'receipts') setReceiptsSubOpen(true);
    } else if (activeTab === 'hrm') {
      setHrmOpen(true);
      if (activeSubTab === 'employees' || activeSubTab === 'departments') {
        setHrmEmployeesOpen(true);
      } else if (activeSubTab === 'attendance' || activeSubTab === 'attendance_config') {
        setHrmAttendanceOpen(true);
      } else if (activeSubTab === 'payroll' || activeSubTab === 'leave') {
        setHrmLeavePayrollOpen(true);
      }
    } else if (activeTab === 'settings' || activeTab === 'providers') {
      setSystemOpen(true);
    }
  }, [activeTab, activeSubTab]);

  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const pendingReceiptCount = receiptExpenseEngine.getSummaryMetrics().pendingCount;

  const handleSelectUser = (id: string) => {
    const updated = coreAuthService.setCurrentUser(id);
    onUserChange(updated);
    setShowRoleMenu(false);
  };

  const handleLinkClick = (tab: string, subTab?: string) => {
    onTabChange(tab, subTab);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 md:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar Container (Fixed left on desktop, slide-out drawer on mobile) */}
      <aside
        className={`fixed left-0 top-0 h-screen z-40 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 flex flex-col justify-between transition-all duration-300 select-none ${
          /* Desktop width */
          isCollapsed ? 'md:w-20' : 'md:w-64'
        } ${
          /* Mobile slide-in behavior */
          isMobileOpen ? 'translate-x-0 w-72 shadow-2xl' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* ========================================================================= */}
        {/* TOP SECTION: Logo, Brand & Scrollable Navigation Menu                    */}
        {/* ========================================================================= */}
        <div className="flex flex-col min-h-0 flex-1">
          {/* Header Brand Bar */}
          <div className="h-16 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
            <div
              onClick={() => handleLinkClick('dashboard')}
              className="flex items-center gap-3 cursor-pointer overflow-hidden min-h-[44px]"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              {(!isCollapsed || isMobileOpen) && (
                <div className="truncate">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-base text-slate-900 dark:text-white tracking-tight">AUDMA OS</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                      ENT
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Autonomous Enterprise Engine</p>
                </div>
              )}
            </div>

            {/* Close Button on Mobile, Collapse Toggle on Desktop */}
            <div className="flex items-center">
              {/* Mobile Close Button */}
              <button
                onClick={onCloseMobile}
                className="md:hidden p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Desktop Collapse Toggle */}
              <button
                onClick={onToggleCollapse}
                className="hidden md:flex p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition min-h-[44px] min-w-[44px] items-center justify-center"
                title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Scrollable Navigation Menu */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3.5 text-xs">
            {/* ===================================================================== */}
            {/* 1. EXECUTIVE COCKPIT */}
            {/* ===================================================================== */}
            <div className="space-y-1">
              <button
                onClick={() => {
                  if (isCollapsed && !isMobileOpen) handleLinkClick('dashboard');
                  else setExecutiveOpen(!executiveOpen);
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 min-h-[36px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold text-[10px] uppercase tracking-wider transition rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/40"
              >
                <div className="flex items-center gap-2">
                  <LayoutDashboard className="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0" />
                  {(!isCollapsed || isMobileOpen) && <span>Executive Cockpit</span>}
                </div>
                {(!isCollapsed || isMobileOpen) && (
                  executiveOpen ? <ChevronDown className="w-3 h-3 text-slate-400 dark:text-slate-500" /> : <ChevronRight className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                )}
              </button>

              {(executiveOpen || (isCollapsed && !isMobileOpen)) && (
                <div className={`${!isCollapsed || isMobileOpen ? 'ml-2 pl-2 border-l border-slate-200 dark:border-slate-800 space-y-1' : 'space-y-1'}`}>
                  <button
                    onClick={() => handleLinkClick('dashboard')}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 min-h-[40px] rounded-lg text-xs font-medium transition ${
                      activeTab === 'dashboard'
                        ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="Overview Dashboard"
                  >
                    <PieChart className="w-4 h-4 shrink-0 text-indigo-500 dark:text-indigo-400" />
                    {(!isCollapsed || isMobileOpen) && <span>Overview & KPI Metrics</span>}
                  </button>

                  <button
                    onClick={() => {
                      onOpenAuditModal();
                      if (onCloseMobile) onCloseMobile();
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 min-h-[40px] rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition"
                    title="Real-Time Audit Log"
                  >
                    <Terminal className="w-4 h-4 shrink-0 text-slate-400" />
                    {(!isCollapsed || isMobileOpen) && <span>Real-Time Audit Log</span>}
                  </button>
                </div>
              )}
            </div>

            {/* ===================================================================== */}
            {/* 2. FINANCE & GENERAL LEDGER */}
            {/* ===================================================================== */}
            <div className="space-y-1">
              <button
                onClick={() => {
                  if (isCollapsed && !isMobileOpen) handleLinkClick('accounting', 'journal');
                  else setFinanceOpen(!financeOpen);
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 min-h-[36px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold text-[10px] uppercase tracking-wider transition rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/40"
              >
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
                  {(!isCollapsed || isMobileOpen) && <span>Finance & GL</span>}
                </div>
                {(!isCollapsed || isMobileOpen) && (
                  financeOpen ? <ChevronDown className="w-3 h-3 text-slate-400 dark:text-slate-500" /> : <ChevronRight className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                )}
              </button>

              {(financeOpen || (isCollapsed && !isMobileOpen)) && (
                <div className={`${!isCollapsed || isMobileOpen ? 'ml-2 pl-2 border-l border-slate-200 dark:border-slate-800 space-y-1' : 'space-y-1'}`}>
                  <button
                    onClick={() => handleLinkClick('accounting', 'coa')}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 min-h-[40px] rounded-lg text-xs font-medium transition ${
                      activeTab === 'accounting' && activeSubTab === 'coa'
                        ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Layers className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
                    {(!isCollapsed || isMobileOpen) && <span>Chart of Accounts</span>}
                  </button>

                  <button
                    onClick={() => handleLinkClick('accounting', 'journal')}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 min-h-[40px] rounded-lg text-xs font-medium transition ${
                      activeTab === 'accounting' && (!activeSubTab || activeSubTab === 'journal')
                        ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <BookOpen className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
                    {(!isCollapsed || isMobileOpen) && <span>Journal Entries</span>}
                  </button>

                  <button
                    onClick={() => handleLinkClick('accounting', 'reports')}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 min-h-[40px] rounded-lg text-xs font-medium transition ${
                      activeTab === 'accounting' && activeSubTab === 'reports'
                        ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
                    {(!isCollapsed || isMobileOpen) && <span>Financial Reports</span>}
                  </button>
                </div>
              )}
            </div>

            {/* ===================================================================== */}
            {/* 3. ACCOUNTS PAYABLE & SUPPLIERS */}
            {/* ===================================================================== */}
            <div className="space-y-1">
              <button
                onClick={() => {
                  if (isCollapsed && !isMobileOpen) handleLinkClick('accounting', 'ap');
                  else setApOpen(!apOpen);
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 min-h-[36px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold text-[10px] uppercase tracking-wider transition rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/40"
              >
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-cyan-500 dark:text-cyan-400 shrink-0" />
                  {(!isCollapsed || isMobileOpen) && <span>Payables & Suppliers</span>}
                </div>
                {(!isCollapsed || isMobileOpen) && (
                  apOpen ? <ChevronDown className="w-3 h-3 text-slate-400 dark:text-slate-500" /> : <ChevronRight className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                )}
              </button>

              {(apOpen || (isCollapsed && !isMobileOpen)) && (
                <div className={`${!isCollapsed || isMobileOpen ? 'ml-2 pl-2 border-l border-slate-200 dark:border-slate-800 space-y-1' : 'space-y-1'}`}>
                  <button
                    onClick={() => handleLinkClick('accounting', 'ap')}
                    className={`w-full flex items-center justify-between px-2.5 py-2 min-h-[40px] rounded-lg text-xs font-medium transition ${
                      activeTab === 'accounting' && activeSubTab === 'ap'
                        ? 'bg-cyan-600 text-white font-semibold shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Building className="w-4 h-4 text-cyan-500 dark:text-cyan-400 shrink-0" />
                      {(!isCollapsed || isMobileOpen) && <span>Bills & 30/60/90 Aging</span>}
                    </div>
                    {(!isCollapsed || isMobileOpen) && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 font-mono font-bold">
                        Aging
                      </span>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* ===================================================================== */}
            {/* 4. AI INTELLIGENCE HUB */}
            {/* ===================================================================== */}
            <div className="space-y-1">
              <button
                onClick={() => {
                  if (isCollapsed && !isMobileOpen) handleLinkClick('ai-invoice');
                  else setAiHubOpen(!aiHubOpen);
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 min-h-[36px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold text-[10px] uppercase tracking-wider transition rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/40"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-500 dark:text-purple-400 shrink-0" />
                  {(!isCollapsed || isMobileOpen) && <span>AI Intelligence Hub</span>}
                </div>
                {(!isCollapsed || isMobileOpen) && (
                  aiHubOpen ? <ChevronDown className="w-3 h-3 text-slate-400 dark:text-slate-500" /> : <ChevronRight className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                )}
              </button>

              {(aiHubOpen || (isCollapsed && !isMobileOpen)) && (
                <div className={`${!isCollapsed || isMobileOpen ? 'ml-2 pl-2 border-l border-slate-200 dark:border-slate-800 space-y-1' : 'space-y-1'}`}>
                  <button
                    onClick={() => handleLinkClick('ai-invoice')}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 min-h-[40px] rounded-lg text-xs font-medium transition ${
                      activeTab === 'ai-invoice'
                        ? 'bg-purple-600 text-white font-semibold shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Wand2 className="w-4 h-4 text-purple-500 dark:text-purple-400 shrink-0" />
                    {(!isCollapsed || isMobileOpen) && <span>Invoice OCR & Outbound</span>}
                  </button>

                  <div className="space-y-0.5">
                    <button
                      onClick={() => {
                        handleLinkClick('receipts', 'inbox');
                        setReceiptsSubOpen(!receiptsSubOpen);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-2 min-h-[40px] rounded-lg text-xs font-medium transition ${
                        activeTab === 'receipts'
                          ? 'bg-purple-600 text-white font-semibold shadow-sm'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Receipt className="w-4 h-4 text-purple-500 dark:text-purple-400 shrink-0" />
                        {(!isCollapsed || isMobileOpen) && <span>Receipt & Expense Hub</span>}
                      </div>
                      {(!isCollapsed || isMobileOpen) && (
                        <div className="flex items-center gap-1">
                          {pendingReceiptCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950">
                              {pendingReceiptCount}
                            </span>
                          )}
                          {receiptsSubOpen ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5" />}
                        </div>
                      )}
                    </button>
                    {(!isCollapsed || isMobileOpen) && receiptsSubOpen && (
                      <div className="ml-4 pl-2 border-l border-slate-200 dark:border-slate-800 space-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                        <button
                          onClick={() => handleLinkClick('receipts', 'inbox')}
                          className={`w-full text-left py-1 px-2 rounded-md transition min-h-[28px] flex items-center ${
                            activeTab === 'receipts' && (!activeSubTab || activeSubTab === 'inbox')
                              ? 'bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 font-bold'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          • Expense Claims Inbox
                        </button>
                        <button
                          onClick={() => handleLinkClick('receipts', 'capture')}
                          className={`w-full text-left py-1 px-2 rounded-md transition min-h-[28px] flex items-center ${
                            activeTab === 'receipts' && activeSubTab === 'capture'
                              ? 'bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 font-bold'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          • Snap & AI Verify
                        </button>
                        <button
                          onClick={() => handleLinkClick('receipts', 'manual')}
                          className={`w-full text-left py-1 px-2 rounded-md transition min-h-[28px] flex items-center ${
                            activeTab === 'receipts' && activeSubTab === 'manual'
                              ? 'bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 font-bold'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          • Manual Voucher Entry
                        </button>
                        <button
                          onClick={() => handleLinkClick('receipts', 'settings')}
                          className={`w-full text-left py-1 px-2 rounded-md transition min-h-[28px] flex items-center ${
                            activeTab === 'receipts' && activeSubTab === 'settings'
                              ? 'bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 font-bold'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          • Layout & Templates
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ===================================================================== */}
            {/* 5. HRM & WORKFORCE */}
            {/* ===================================================================== */}
            <div className="space-y-1">
              <button
                onClick={() => {
                  if (isCollapsed && !isMobileOpen) handleLinkClick('hrm');
                  else setHrmOpen(!hrmOpen);
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 min-h-[36px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold text-[10px] uppercase tracking-wider transition rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/40"
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0" />
                  {(!isCollapsed || isMobileOpen) && <span>HRM & Workforce</span>}
                </div>
                {(!isCollapsed || isMobileOpen) && (
                  hrmOpen ? <ChevronDown className="w-3 h-3 text-slate-400 dark:text-slate-500" /> : <ChevronRight className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                )}
              </button>

              {(hrmOpen || (isCollapsed && !isMobileOpen)) && (
                <div className={`${!isCollapsed || isMobileOpen ? 'ml-2 pl-2 border-l border-slate-200 dark:border-slate-800 space-y-1' : 'space-y-1'}`}>
                  {/* Employee Management / Staff Directory */}
                  <div className="space-y-0.5">
                    <button
                      onClick={() => {
                        handleLinkClick('hrm', 'employees');
                        setHrmEmployeesOpen(!hrmEmployeesOpen);
                      }}
                      className={`w-full flex items-center justify-between px-2 py-1.5 min-h-[36px] rounded text-xs transition ${
                        activeTab === 'hrm' && activeSubTab === 'employees'
                          ? 'text-indigo-700 dark:text-indigo-300 font-semibold bg-indigo-50 dark:bg-indigo-500/10'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
                        {(!isCollapsed || isMobileOpen) && <span>Employee Management</span>}
                      </div>
                      {(!isCollapsed || isMobileOpen) && (
                        hrmEmployeesOpen ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5" />
                      )}
                    </button>
                    {(!isCollapsed || isMobileOpen) && hrmEmployeesOpen && (
                      <div className="ml-4 pl-2 border-l border-slate-200 dark:border-slate-800 space-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                        <button
                          onClick={() => handleLinkClick('hrm', 'employees')}
                          className={`w-full text-left py-1 px-2 rounded-md transition min-h-[32px] flex items-center ${
                            activeTab === 'hrm' && activeSubTab === 'employees'
                              ? 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-bold'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          • Staff Directory
                        </button>
                        <button
                          onClick={() => handleLinkClick('hrm', 'departments')}
                          className={`w-full text-left py-1 px-2 rounded-md transition min-h-[32px] flex items-center ${
                            activeTab === 'hrm' && activeSubTab === 'departments'
                              ? 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-bold'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          • Department Directory & HODs
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Attendance Logs & Shifts */}
                  <div className="space-y-0.5">
                    <button
                      onClick={() => {
                        handleLinkClick('hrm', 'attendance');
                        setHrmAttendanceOpen(!hrmAttendanceOpen);
                      }}
                      className={`w-full flex items-center justify-between px-2 py-1.5 min-h-[36px] rounded text-xs transition ${
                        activeTab === 'hrm' && (activeSubTab === 'attendance' || activeSubTab === 'attendance_config')
                          ? 'text-indigo-700 dark:text-indigo-300 font-semibold bg-indigo-50 dark:bg-indigo-500/10'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
                        {(!isCollapsed || isMobileOpen) && <span>Time & Attendance</span>}
                      </div>
                      {(!isCollapsed || isMobileOpen) && (
                        hrmAttendanceOpen ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5" />
                      )}
                    </button>
                    {(!isCollapsed || isMobileOpen) && hrmAttendanceOpen && (
                      <div className="ml-4 pl-2 border-l border-slate-200 dark:border-slate-800 space-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                        <button
                          onClick={() => handleLinkClick('hrm', 'attendance')}
                          className={`w-full text-left py-1 px-2 rounded-md transition min-h-[32px] flex items-center ${
                            activeTab === 'hrm' && activeSubTab === 'attendance'
                              ? 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-bold'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          • Attendance Logs & Shifts
                        </button>
                        <button
                          onClick={() => handleLinkClick('hrm', 'attendance_config')}
                          className={`w-full text-left py-1 px-2 rounded-md transition min-h-[32px] flex items-center ${
                            activeTab === 'hrm' && activeSubTab === 'attendance_config'
                              ? 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-bold'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          • Attendance Configuration
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Leave Requests & Approvals and Payroll Engine */}
                  <div className="space-y-0.5">
                    <button
                      onClick={() => {
                        handleLinkClick('hrm', 'payroll');
                        setHrmLeavePayrollOpen(!hrmLeavePayrollOpen);
                      }}
                      className={`w-full flex items-center justify-between px-2 py-1.5 min-h-[36px] rounded text-xs transition ${
                        activeTab === 'hrm' && (activeSubTab === 'payroll' || activeSubTab === 'leave')
                          ? 'text-indigo-700 dark:text-indigo-300 font-semibold bg-indigo-50 dark:bg-indigo-500/10'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
                        {(!isCollapsed || isMobileOpen) && <span>Leave & Payroll</span>}
                      </div>
                      {(!isCollapsed || isMobileOpen) && (
                        hrmLeavePayrollOpen ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5" />
                      )}
                    </button>
                    {(!isCollapsed || isMobileOpen) && hrmLeavePayrollOpen && (
                      <div className="ml-4 pl-2 border-l border-slate-200 dark:border-slate-800 space-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                        <button
                          onClick={() => handleLinkClick('hrm', 'leave')}
                          className={`w-full text-left py-1 px-2 rounded-md transition min-h-[32px] flex items-center ${
                            activeTab === 'hrm' && activeSubTab === 'leave'
                              ? 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-bold'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          • Leave Requests & Approvals
                        </button>
                        <button
                          onClick={() => handleLinkClick('hrm', 'payroll')}
                          className={`w-full text-left py-1 px-2 rounded-md transition min-h-[32px] flex items-center ${
                            activeTab === 'hrm' && activeSubTab === 'payroll'
                              ? 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-bold'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          • Payroll Engine & Payslips
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ===================================================================== */}
            {/* 6. SYSTEM & SETTINGS */}
            {/* ===================================================================== */}
            <div className="space-y-1">
              <button
                onClick={() => {
                  if (isCollapsed && !isMobileOpen) handleLinkClick('settings', 'brand');
                  else setSystemOpen(!systemOpen);
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 min-h-[36px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold text-[10px] uppercase tracking-wider transition rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/40"
              >
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
                  {(!isCollapsed || isMobileOpen) && <span>System & Settings</span>}
                </div>
                {(!isCollapsed || isMobileOpen) && (
                  systemOpen ? <ChevronDown className="w-3 h-3 text-slate-400 dark:text-slate-500" /> : <ChevronRight className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                )}
              </button>

              {(systemOpen || (isCollapsed && !isMobileOpen)) && (
                <div className={`${!isCollapsed || isMobileOpen ? 'ml-2 pl-2 border-l border-slate-200 dark:border-slate-800 space-y-1' : 'space-y-1'}`}>
                  <button
                    onClick={() => handleLinkClick('settings', 'brand')}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 min-h-[38px] rounded-lg text-xs font-medium transition ${
                      activeTab === 'settings' && (activeSubTab === 'brand' || !activeSubTab)
                        ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Palette className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
                    {(!isCollapsed || isMobileOpen) && <span>Theme & Brand</span>}
                  </button>

                  <button
                    onClick={() => handleLinkClick('settings', 'profile')}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 min-h-[38px] rounded-lg text-xs font-medium transition ${
                      activeTab === 'settings' && activeSubTab === 'profile'
                        ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <User className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                    {(!isCollapsed || isMobileOpen) && <span>My Account & Profile</span>}
                  </button>

                  <button
                    onClick={() => handleLinkClick('settings', 'directory')}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 min-h-[38px] rounded-lg text-xs font-medium transition ${
                      activeTab === 'settings' && activeSubTab === 'directory'
                        ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400 shrink-0" />
                    {(!isCollapsed || isMobileOpen) && <span>Directory & OU Groups</span>}
                  </button>

                  <button
                    onClick={() => handleLinkClick('settings', 'providers')}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 min-h-[38px] rounded-lg text-xs font-medium transition ${
                      (activeTab === 'settings' && activeSubTab === 'providers') || activeTab === 'providers'
                        ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Cpu className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
                    {(!isCollapsed || isMobileOpen) && <span>Provider Adapters</span>}
                  </button>

                  <button
                    onClick={() => {
                      onOpenAuditModal();
                      if (onCloseMobile) onCloseMobile();
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 min-h-[38px] rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition"
                  >
                    <Shield className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {(!isCollapsed || isMobileOpen) && <span>Security RBAC & Audit</span>}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BOTTOM SECTION: Theme Toggle & User Persona Profile                      */}
        {/* Positioned cleanly at bottom without awkward vertical gap/spacer divs    */}
        {/* ========================================================================= */}
        <div className="sidebar-footer p-3 border-t border-slate-200 dark:border-slate-800 space-y-2 bg-[#f1f5f9] dark:bg-slate-950/60 shrink-0">
          {/* Dark / Light Theme Toggle */}
          <div className="flex items-center justify-between px-2 py-1 text-slate-500 dark:text-slate-400 text-xs">
            {(!isCollapsed || isMobileOpen) && <span className="text-[11px] font-medium">Color Mode:</span>}
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition flex items-center gap-1.5 min-h-[36px]"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  {(!isCollapsed || isMobileOpen) && <span className="text-[11px]">Light Mode</span>}
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-indigo-600" />
                  {(!isCollapsed || isMobileOpen) && <span className="text-[11px]">Dark Mode</span>}
                </>
              )}
            </button>
          </div>

          {/* User Persona Button */}
          <div className="relative">
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className={`w-full flex items-center gap-3 p-2 rounded-xl hover:bg-slate-200/80 dark:hover:bg-slate-800/80 transition text-left min-h-[44px] ${
                isCollapsed && !isMobileOpen ? 'justify-center' : ''
              }`}
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-md">
                {currentUser.name.split(' ').map((n) => n[0]).join('')}
              </div>

              {(!isCollapsed || isMobileOpen) && (
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{currentUser.name}</div>
                  <div className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-semibold uppercase tracking-wider truncate">
                    {currentUser.role.replace(/_/g, ' ')}
                  </div>
                </div>
              )}

              {(!isCollapsed || isMobileOpen) && <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
            </button>

            {/* Role Switcher Popover */}
            {showRoleMenu && (
              <div
                className={`absolute bottom-14 ${
                  isCollapsed && !isMobileOpen ? 'left-20' : 'left-0 right-0'
                } bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-2 z-50 w-64 space-y-1 animate-in fade-in slide-in-from-bottom-2`}
              >
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700">
                  Switch Operating Persona
                </div>
                {DEFAULT_USERS.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => handleSelectUser(u.id)}
                    className={`w-full text-left p-2 rounded-lg text-xs transition flex items-center justify-between min-h-[38px] ${
                      currentUser.id === u.id
                        ? 'bg-indigo-600 text-white font-semibold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-medium text-slate-900 dark:text-slate-100">{u.name}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 opacity-80">{u.role.replace(/_/g, ' ')}</div>
                    </div>
                    {currentUser.id === u.id && <UserCheck className="w-3.5 h-3.5 text-white" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
