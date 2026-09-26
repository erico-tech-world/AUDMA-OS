import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  PlusCircle,
  FileText,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Building,
  DollarSign,
  CreditCard,
  Search,
  ArrowRight,
  ShieldAlert,
  Clock,
  BarChart3,
  PieChart,
  Calendar,
  Layers,
  ChevronRight,
  Info,
} from 'lucide-react';
import { glEngine } from '../domains/accounting/gl-engine';
import { coreAuthService } from '../domains/core/rbac';
import { formatCurrency, isBalanced, toDecimal } from '../lib/math';
import { ChartAccount } from '../types';
import { Modal } from './Modal';

interface AccountingViewProps {
  initialSubTab?: 'coa' | 'journal' | 'reports' | 'ap';
  subTabOverride?: 'coa' | 'journal' | 'reports' | 'ap';
  onSubTabChange?: (tab: 'coa' | 'journal' | 'reports' | 'ap') => void;
}

export const AccountingView: React.FC<AccountingViewProps> = ({
  initialSubTab = 'journal',
  subTabOverride,
  onSubTabChange,
}) => {
  const [subTab, setSubTab] = useState<'coa' | 'journal' | 'reports' | 'ap'>(initialSubTab);

  const handleSubTabChange = (newTab: 'coa' | 'journal' | 'reports' | 'ap') => {
    setSubTab(newTab);
    onSubTabChange?.(newTab);
  };

  useEffect(() => {
    if (subTabOverride) {
      setSubTab(subTabOverride);
    }
  }, [subTabOverride]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewEntryModal, setShowNewEntryModal] = useState(false);
  const [reportType, setReportType] = useState<'trial_balance' | 'pnl' | 'balance_sheet'>('trial_balance');

  // Trigger state update
  const [, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);

  const accounts = glEngine.getAccounts();
  const journalEntries = glEngine.getJournalEntries();
  const vendors = glEngine.getVendors();
  const invoices = glEngine.getInvoices();
  const purchaseOrders = glEngine.getPurchaseOrders();

  // New Journal Entry Form State
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [entryMemo, setEntryMemo] = useState('');
  const [entryLines, setEntryLines] = useState<
    { accountId: string; description: string; debit: string; credit: string }[]
  >([
    { accountId: accounts[0]?.id || '', description: '', debit: '0.00', credit: '0.00' },
    { accountId: accounts[3]?.id || '', description: '', debit: '0.00', credit: '0.00' },
  ]);
  const [entryError, setEntryError] = useState<string | null>(null);

  // Check balance live
  const balanceStatus = isBalanced(
    entryLines.map((l) => l.debit),
    entryLines.map((l) => l.credit)
  );

  const handleAddLine = () => {
    setEntryLines([
      ...entryLines,
      { accountId: accounts[0]?.id || '', description: '', debit: '0.00', credit: '0.00' },
    ]);
  };

  const handleRemoveLine = (index: number) => {
    if (entryLines.length > 2) {
      setEntryLines(entryLines.filter((_, i) => i !== index));
    }
  };

  const handleLineChange = (
    index: number,
    field: 'accountId' | 'description' | 'debit' | 'credit',
    value: string
  ) => {
    const updated = [...entryLines];
    updated[index] = { ...updated[index], [field]: value };
    setEntryLines(updated);
  };

  const handlePostJournalEntry = (e: React.FormEvent) => {
    e.preventDefault();
    setEntryError(null);

    if (!entryMemo.trim()) {
      setEntryError('Memo is required for audit trail.');
      return;
    }

    if (!balanceStatus.balanced) {
      setEntryError(
        `Debits and Credits must balance! Difference: ${balanceStatus.difference.toFixed(2)}`
      );
      return;
    }

    try {
      glEngine.postJournalEntry({
        date: entryDate,
        memo: entryMemo,
        sourceModule: 'GENERAL',
        lines: entryLines,
      });
      setShowNewEntryModal(false);
      setEntryMemo('');
      setEntryLines([
        { accountId: accounts[0]?.id || '', description: '', debit: '0.00', credit: '0.00' },
        { accountId: accounts[3]?.id || '', description: '', debit: '0.00', credit: '0.00' },
      ]);
      refresh();
    } catch (err: any) {
      setEntryError(err.message);
    }
  };

  const handleApproveInvoice = (invoiceId: string) => {
    try {
      glEngine.approveInvoiceAndPostGL(invoiceId);
      refresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handlePayInvoice = (invoiceId: string) => {
    try {
      glEngine.recordVendorPayment(invoiceId);
      refresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const trialBalance = glEngine.generateTrialBalance();
  const pnl = glEngine.generateProfitAndLoss();
  const balanceSheet = glEngine.generateBalanceSheet();

  const filteredAccounts = accounts.filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.code.includes(searchQuery) ||
      a.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Module Hero Header Card */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white dark:bg-slate-900/80 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Double-Entry General Ledger (GL) & Financial Hub
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Compliant double-entry bookkeeping engine with strict debit/credit balance enforcement using decimal.js.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-semibold font-mono text-[11px] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            GL Balanced (Decimal.js)
          </span>
        </div>
      </div>

      {/* Prominent Sub-Navigation Switcher (Sticky top-16 z-20) */}
      <div className="sticky top-16 z-20 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md py-3 -mt-3 -mx-1 px-1 border-b border-slate-200/80 dark:border-slate-800/80 mb-6 flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-thin max-w-full">
        <button
          onClick={() => handleSubTabChange('journal')}
          className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition cursor-pointer ${
            subTab === 'journal'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>📒 Journal Entries ({journalEntries.length})</span>
        </button>

        <button
          onClick={() => handleSubTabChange('coa')}
          className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition cursor-pointer ${
            subTab === 'coa'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>📊 Chart of Accounts ({accounts.length})</span>
        </button>

        <button
          onClick={() => handleSubTabChange('reports')}
          className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition cursor-pointer ${
            subTab === 'reports'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <PieChart className="w-4 h-4" />
          <span>📑 Financial Reports</span>
        </button>

        <button
          onClick={() => handleSubTabChange('ap')}
          className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition cursor-pointer ${
            subTab === 'ap'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>💳 Accounts Payable ({invoices.length})</span>
        </button>
      </div>

      {/* ================= SUBTAB: JOURNAL ENTRIES ================= */}
      {subTab === 'journal' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Showing <span className="font-semibold text-slate-900 dark:text-white">{journalEntries.length}</span> posted General Ledger journal entries
            </div>

            {coreAuthService.hasPermission('accounting:post_journal') && (
              <button
                id="btn-new-journal-entry"
                onClick={() => setShowNewEntryModal(true)}
                className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-2 shadow-sm shadow-indigo-600/30 transition"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Post Journal Entry</span>
              </button>
            )}
          </div>

          <div className="space-y-3">
            {journalEntries.map((je) => (
              <div
                key={je.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition"
              >
                <div className="px-5 py-3 bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">{je.entryNumber}</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-600 dark:text-slate-300 font-medium">{je.date}</span>
                    <span className="text-slate-600 dark:text-slate-400 font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                      Module: {je.sourceModule}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-slate-500 dark:text-slate-400 text-[11px]">Posted by: {je.postedBy}</span>
                    <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-semibold text-xs bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 rounded">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      <span>Debits & Credits Balanced (${je.totalDebit})</span>
                    </div>
                  </div>
                </div>

                <div className="px-5 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 italic border-b border-slate-100 dark:border-slate-800/50">
                  Memo: {je.memo}
                </div>

                <div className="w-full overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left text-xs min-w-[700px]">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold bg-slate-50 dark:bg-slate-900/40">
                        <th className="py-2.5 px-5">Account Code</th>
                        <th className="py-2.5 px-5">Account Title</th>
                        <th className="py-2.5 px-5">Line Description</th>
                        <th className="py-2.5 px-5 text-right">Debit ($)</th>
                        <th className="py-2.5 px-5 text-right">Credit ($)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                      {je.lines.map((line) => (
                        <tr key={line.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition text-slate-800 dark:text-slate-200">
                          <td className="py-2 px-5 font-mono text-indigo-600 dark:text-indigo-300 font-semibold">{line.accountCode}</td>
                          <td className="py-2 px-5 font-medium">{line.accountName}</td>
                          <td className="py-2 px-5 text-slate-500 dark:text-slate-400">{line.description || '—'}</td>
                          <td className="py-2 px-5 text-right font-mono font-medium">
                            {toDecimal(line.debit).greaterThan(0) ? line.debit : '—'}
                          </td>
                          <td className="py-2 px-5 text-right font-mono font-medium">
                            {toDecimal(line.credit).greaterThan(0) ? line.credit : '—'}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50 dark:bg-slate-900/80 font-bold border-t border-slate-200 dark:border-slate-800">
                        <td colSpan={3} className="py-2 px-5 text-right text-slate-600 dark:text-slate-400">
                          Total Balanced Lines:
                        </td>
                        <td className="py-2 px-5 text-right font-mono text-emerald-600 dark:text-emerald-400">
                          ${je.totalDebit}
                        </td>
                        <td className="py-2 px-5 text-right font-mono text-emerald-600 dark:text-emerald-400">
                          ${je.totalCredit}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= SUBTAB: CHART OF ACCOUNTS ================= */}
      {subTab === 'coa' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery || ''}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search account code, name..."
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>Categories:</span>
              <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 text-[10px] font-semibold border border-emerald-200 dark:border-emerald-800/50">Assets (1xxx)</span>
              <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-400 text-[10px] font-semibold border border-amber-200 dark:border-amber-800/50">Liabilities (2xxx)</span>
              <span className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-400 text-[10px] font-semibold border border-purple-200 dark:border-purple-800/50">Equity (3xxx)</span>
              <span className="px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-400 text-[10px] font-semibold border border-cyan-200 dark:border-cyan-800/50">Revenue (4xxx)</span>
              <span className="px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-400 text-[10px] font-semibold border border-rose-200 dark:border-rose-800/50">Expenses (5xxx)</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="w-full overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs min-w-[750px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 font-semibold">
                    <th className="py-3 px-5">Code</th>
                    <th className="py-3 px-5">Account Name</th>
                    <th className="py-3 px-5">Classification</th>
                    <th className="py-3 px-5">Normal Balance</th>
                    <th className="py-3 px-5">Description</th>
                    <th className="py-3 px-5 text-right">Current Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredAccounts.map((acc) => (
                    <tr key={acc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition text-slate-800 dark:text-slate-200">
                      <td className="py-3 px-5 font-mono font-bold text-indigo-600 dark:text-indigo-400">{acc.code}</td>
                      <td className="py-3 px-5 font-semibold text-slate-900 dark:text-white">{acc.name}</td>
                      <td className="py-3 px-5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            acc.category === 'ASSET'
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50'
                              : acc.category === 'LIABILITY'
                              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50'
                              : acc.category === 'EQUITY'
                              ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-400 border border-purple-200 dark:border-purple-800/50'
                              : acc.category === 'REVENUE'
                              ? 'bg-cyan-100 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800/50'
                              : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50'
                          }`}
                        >
                          {acc.category}
                        </span>
                      </td>
                      <td className="py-3 px-5 font-mono text-[11px] text-slate-500 dark:text-slate-400">{acc.normalBalance}</td>
                      <td className="py-3 px-5 text-slate-500 dark:text-slate-400 text-xs truncate max-w-xs">{acc.description}</td>
                      <td className="py-3 px-5 text-right font-mono font-bold text-sm text-slate-900 dark:text-white">
                        {formatCurrency(acc.currentBalance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= SUBTAB: FINANCIAL REPORTS ================= */}
      {subTab === 'reports' && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <button
              onClick={() => setReportType('trial_balance')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                reportType === 'trial_balance'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              Trial Balance
            </button>
            <button
              onClick={() => setReportType('pnl')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                reportType === 'pnl'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              Profit & Loss (P&L)
            </button>
            <button
              onClick={() => setReportType('balance_sheet')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                reportType === 'balance_sheet'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              Balance Sheet
            </button>
          </div>

          {/* Trial Balance */}
          {reportType === 'trial_balance' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Trial Balance Statement</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Verification that sum of all debit balances equals sum of all credit balances
                  </p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-400 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Exact Balance Enforced: Total ${trialBalance.totalDebit}</span>
                </div>
              </div>

              <div className="w-full overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-xs min-w-[750px]">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold bg-slate-50 dark:bg-slate-900/60">
                      <th className="py-2.5 px-4">Code</th>
                      <th className="py-2.5 px-4">Account Name</th>
                      <th className="py-2.5 px-4">Category</th>
                      <th className="py-2.5 px-4 text-right">Debit Balance ($)</th>
                      <th className="py-2.5 px-4 text-right">Credit Balance ($)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                    {trialBalance.rows.map((row) => (
                      <tr key={row.code} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 text-slate-800 dark:text-slate-200">
                        <td className="py-2.5 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">{row.code}</td>
                        <td className="py-2.5 px-4 font-medium">{row.name}</td>
                        <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400">{row.category}</td>
                        <td className="py-2.5 px-4 text-right font-mono">
                          {toDecimal(row.debit).greaterThan(0) ? row.debit : '—'}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono">
                          {toDecimal(row.credit).greaterThan(0) ? row.credit : '—'}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 dark:bg-slate-900 font-bold border-t-2 border-slate-300 dark:border-slate-700 text-sm">
                      <td colSpan={3} className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">
                        TOTAL TRIAL BALANCE:
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400">
                        ${trialBalance.totalDebit}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400">
                        ${trialBalance.totalCredit}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Profit & Loss */}
          {reportType === 'pnl' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Profit & Loss Statement (Income Statement)</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Operating revenues minus operating expenses for the current fiscal period</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Revenue */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-cyan-300 dark:border-cyan-800/50 text-cyan-700 dark:text-cyan-400 font-bold text-sm">
                    <span>Operating Revenue (4000 series)</span>
                    <span>{formatCurrency(pnl.totalRevenue)}</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    {pnl.revenueAccounts.map((r) => (
                      <div key={r.code} className="flex justify-between text-slate-700 dark:text-slate-300 py-1 border-b border-slate-100 dark:border-slate-800/40">
                        <span>{r.code} - {r.name}</span>
                        <span className="font-mono font-semibold text-slate-900 dark:text-white">{formatCurrency(r.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Expenses */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-rose-300 dark:border-rose-800/50 text-rose-700 dark:text-rose-400 font-bold text-sm">
                    <span>Operating Expenses (5000 series)</span>
                    <span>{formatCurrency(pnl.totalExpenses)}</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    {pnl.expenseAccounts.map((e) => (
                      <div key={e.code} className="flex justify-between text-slate-700 dark:text-slate-300 py-1 border-b border-slate-100 dark:border-slate-800/40">
                        <span>{e.code} - {e.name}</span>
                        <span className="font-mono font-semibold text-slate-900 dark:text-white">{formatCurrency(e.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Net Operating Income Banner */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-indigo-200 dark:border-indigo-500/40 flex items-center justify-between text-slate-900 dark:text-white">
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Net Operating Income</div>
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{formatCurrency(pnl.netIncome)}</div>
                </div>
                <div className="text-right text-xs text-slate-500 dark:text-slate-400">
                  <span>Operating Margin: </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    {toDecimal(pnl.totalRevenue).greaterThan(0)
                      ? toDecimal(pnl.netIncome).times(100).dividedBy(toDecimal(pnl.totalRevenue)).toFixed(1)
                      : '0'}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Balance Sheet */}
          {reportType === 'balance_sheet' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Balance Sheet Statement</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Assets = Liabilities + Equity (Fundamental Accounting Equation)</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 rounded bg-indigo-100 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300 text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Equation Balanced: ${balanceSheet.totalAssets} = ${balanceSheet.totalLiabilitiesAndEquity}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Assets */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-emerald-300 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                    <span>Total Assets (1000 series)</span>
                    <span>{formatCurrency(balanceSheet.totalAssets)}</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    {balanceSheet.assetAccounts.map((a) => (
                      <div key={a.code} className="flex justify-between text-slate-700 dark:text-slate-300 py-1 border-b border-slate-100 dark:border-slate-800/40">
                        <span>{a.code} - {a.name}</span>
                        <span className="font-mono font-semibold text-slate-900 dark:text-white">{formatCurrency(a.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Liabilities & Equity */}
                <div className="space-y-6">
                  {/* Liabilities */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-amber-300 dark:border-amber-800/60 text-amber-700 dark:text-amber-400 font-bold text-sm">
                      <span>Total Liabilities (2000 series)</span>
                      <span>{formatCurrency(balanceSheet.totalLiabilities)}</span>
                    </div>
                    <div className="space-y-2 text-xs">
                      {balanceSheet.liabilityAccounts.map((l) => (
                        <div key={l.code} className="flex justify-between text-slate-700 dark:text-slate-300 py-1 border-b border-slate-100 dark:border-slate-800/40">
                          <span>{l.code} - {l.name}</span>
                          <span className="font-mono font-semibold text-slate-900 dark:text-white">{formatCurrency(l.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Equity */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-purple-300 dark:border-purple-800/60 text-purple-700 dark:text-purple-400 font-bold text-sm">
                      <span>Total Equity (3000 series + Net Income)</span>
                      <span>{formatCurrency(balanceSheet.totalEquity)}</span>
                    </div>
                    <div className="space-y-2 text-xs">
                      {balanceSheet.equityAccounts.map((e) => (
                        <div key={e.code} className="flex justify-between text-slate-700 dark:text-slate-300 py-1 border-b border-slate-100 dark:border-slate-800/40">
                          <span>{e.code} - {e.name}</span>
                          <span className="font-mono font-semibold">{formatCurrency(e.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= SUBTAB: ACCOUNTS PAYABLE (AP) ================= */}
      {subTab === 'ap' && (() => {
        const agingReport = glEngine.generateAPAgingReport();
        const totalNum = parseFloat(agingReport.overall.total) || 1;
        const currentPct = Math.round(((parseFloat(agingReport.overall.current) || 0) / totalNum) * 100);
        const thirtyPct = Math.round(((parseFloat(agingReport.overall.days31To60) || 0) / totalNum) * 100);
        const sixtyPct = Math.round(((parseFloat(agingReport.overall.days61To90) || 0) / totalNum) * 100);
        const overNinetyPct = Math.max(0, 100 - currentPct - thirtyPct - sixtyPct);

        return (
          <div className="space-y-6">
            {/* AP Aging Analytics Header & 30/60/90 Breakdown */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Accounts Payable 30/60/90-Day Aging Analytics</h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                      As of 2026-09-21
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">
                    Categorizes unpaid vendor invoices by days outstanding to optimize treasury disbursements,
                    protect supplier credit relationships, and prevent overdue interest charges.
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Total Pending AP Liabilities</span>
                  <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
                    {formatCurrency(agingReport.overall.total)}
                  </span>
                </div>
              </div>

              {/* 4 Aging Bucket Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Current 0-30 Days */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-emerald-200 dark:border-emerald-900/40 hover:border-emerald-300 dark:hover:border-emerald-700/60 transition space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Current (0–30 Days)</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      {currentPct}%
                    </span>
                  </div>
                  <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                    {formatCurrency(agingReport.overall.current)}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                    <span>Standard Terms</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">Due &lt;30d</span>
                  </div>
                </div>

                {/* 31-60 Days */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-amber-200 dark:border-amber-900/40 hover:border-amber-300 dark:hover:border-amber-700/60 transition space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">31–60 Days</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      {thirtyPct}%
                    </span>
                  </div>
                  <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                    {formatCurrency(agingReport.overall.days31To60)}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                    <span>Net-30 Due</span>
                    <span className="text-amber-600 dark:text-amber-400 font-medium">30d Cycle</span>
                  </div>
                </div>

                {/* 61-90 Days */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-orange-200 dark:border-orange-900/40 hover:border-orange-300 dark:hover:border-orange-700/60 transition space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-orange-700 dark:text-orange-400">61–90 Days</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
                      {sixtyPct}%
                    </span>
                  </div>
                  <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                    {formatCurrency(agingReport.overall.days61To90)}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                    <span>Approaching Late</span>
                    <span className="text-orange-600 dark:text-orange-400 font-medium">Prioritize</span>
                  </div>
                </div>

                {/* Over 90 Days */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-rose-200 dark:border-rose-900/50 hover:border-rose-300 dark:hover:border-rose-700/70 transition space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-rose-700 dark:text-rose-400">Over 90 Days</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                      {overNinetyPct}%
                    </span>
                  </div>
                  <div className="text-xl font-bold font-mono text-rose-700 dark:text-rose-300">
                    {formatCurrency(agingReport.overall.over90Days)}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                    <span>Overdue Risk</span>
                    <span className="text-rose-600 dark:text-rose-400 font-semibold">Immediate Action</span>
                  </div>
                </div>
              </div>

              {/* Liability Aging Distribution Bar */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>Aging Liability Distribution</span>
                  <span>100% Total Exposure</span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex">
                  <div style={{ width: `${currentPct}%` }} className="bg-emerald-500 h-full" title={`Current: ${currentPct}%`} />
                  <div style={{ width: `${thirtyPct}%` }} className="bg-amber-500 h-full" title={`31-60d: ${thirtyPct}%`} />
                  <div style={{ width: `${sixtyPct}%` }} className="bg-orange-500 h-full" title={`61-90d: ${sixtyPct}%`} />
                  <div style={{ width: `${overNinetyPct}%` }} className="bg-rose-500 h-full" title={`Over 90d: ${overNinetyPct}%`} />
                </div>
                <div className="flex flex-wrap items-center gap-4 text-[10px] text-slate-500 dark:text-slate-400 pt-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Current
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span> 31–60 Days
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-orange-500"></span> 61–90 Days
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span> Over 90 Days
                  </span>
                </div>
              </div>

              {/* Vendor Aging Matrix Table */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-300">
                  <span>Vendor Liability Breakdown Matrix</span>
                  <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">Detailed Aging per Supplier</span>
                </div>

                <div className="w-full overflow-x-auto custom-scrollbar rounded-lg border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs min-w-[700px]">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="p-3">Vendor / Supplier</th>
                        <th className="p-3 text-right">Current</th>
                        <th className="p-3 text-right">31–60 Days</th>
                        <th className="p-3 text-right">61–90 Days</th>
                        <th className="p-3 text-right">Over 90 Days</th>
                        <th className="p-3 text-right">Total Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300 font-mono">
                      {agingReport.vendorBreakdown.map((vb) => (
                        <tr key={vb.vendorId} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                          <td className="p-3 font-sans font-medium text-slate-900 dark:text-white">{vb.vendorName}</td>
                          <td className="p-3 text-right text-emerald-600 dark:text-emerald-400">{formatCurrency(vb.current)}</td>
                          <td className="p-3 text-right text-amber-600 dark:text-amber-400">{formatCurrency(vb.days31To60)}</td>
                          <td className="p-3 text-right text-orange-600 dark:text-orange-400">{formatCurrency(vb.days61To90)}</td>
                          <td className="p-3 text-right text-rose-600 dark:text-rose-400">{formatCurrency(vb.over90Days)}</td>
                          <td className="p-3 text-right font-bold text-slate-900 dark:text-white">{formatCurrency(vb.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Vendors directory */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <Building className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Approved Vendor Directory</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {vendors.map((v) => (
                <div key={v.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">{v.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold">
                      {v.paymentTerms}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 space-y-0.5">
                    <div>Tax ID: <span className="font-mono text-slate-700 dark:text-slate-300">{v.taxId}</span></div>
                    <div>Email: <span className="text-slate-700 dark:text-slate-300">{v.contactEmail}</span></div>
                    <div>Category: <span className="text-slate-700 dark:text-slate-300">{v.category}</span></div>
                  </div>
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700/80 flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Balance Due:</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">{formatCurrency(v.balanceDue)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Invoices List */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Vendor Invoices Ledger</span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Review, audit, and approve supplier invoices into Accounts Payable and General Ledger
                </p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                {invoices.length} Invoices
              </span>
            </div>

            <div className="space-y-3">
              {invoices.map((inv) => (
                <div
                  key={inv.id}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-300 dark:hover:border-slate-600 transition"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-bold text-slate-900 dark:text-white text-sm tracking-tight">{inv.vendorName}</span>
                      <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-md bg-slate-900 text-white dark:bg-slate-800 dark:text-slate-100 border border-slate-700 dark:border-slate-600 shadow-xs tracking-tight">
                        #{inv.invoiceNumber}
                      </span>
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border shadow-xs ${
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

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <span>Invoice Date:</span>
                        <span className="font-bold text-slate-900 dark:text-white font-mono bg-slate-100 dark:bg-slate-800/80 px-1.5 py-0.5 rounded text-[11px] border border-slate-200 dark:border-slate-700">
                          {inv.invoiceDate}
                        </span>
                      </span>
                      <span className="text-slate-300 dark:text-slate-700">•</span>
                      <span className="flex items-center gap-1.5">
                        <span>Due Date:</span>
                        <span className="font-bold text-slate-900 dark:text-white font-mono bg-slate-100 dark:bg-slate-800/80 px-1.5 py-0.5 rounded text-[11px] border border-slate-200 dark:border-slate-700">
                          {inv.dueDate}
                        </span>
                      </span>
                      <span className="text-slate-300 dark:text-slate-700">•</span>
                      <span className="flex items-center gap-1.5">
                        <span>Lines:</span>
                        <span className="font-bold text-slate-900 dark:text-white font-mono bg-slate-100 dark:bg-slate-800/80 px-1.5 py-0.5 rounded text-[11px] border border-slate-200 dark:border-slate-700">
                          {inv.lineItems.length}
                        </span>
                      </span>
                      {inv.journalEntryId && (
                        <span className="text-indigo-700 dark:text-indigo-300 font-mono text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded">
                          GL Ref: {inv.journalEntryId}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end md:self-center">
                    <div className="text-right">
                      <div className="text-base font-bold text-slate-900 dark:text-white font-mono">{formatCurrency(inv.totalAmount)}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Tax: {formatCurrency(inv.taxAmount)} ({inv.taxRatePercent}%)</div>
                    </div>

                    {inv.status === 'PENDING_AUDIT' && coreAuthService.hasPermission('accounting:approve_invoice') && (
                      <button
                        onClick={() => handleApproveInvoice(inv.id)}
                        className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition shadow-sm"
                      >
                        Approve & Post GL
                      </button>
                    )}

                    {inv.status === 'POSTED_TO_GL' && coreAuthService.hasPermission('accounting:post_journal') && (
                      <button
                        onClick={() => handlePayInvoice(inv.id)}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition shadow-sm"
                      >
                        Disburse Payment
                      </button>
                    )}

                    {inv.status === 'PAID' && (
                      <span className="text-xs text-cyan-800 dark:text-cyan-300 font-bold px-3 py-1 rounded-lg bg-cyan-100 dark:bg-cyan-950/80 border border-cyan-300 dark:border-cyan-700">
                        Paid in Full
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ); })()}

      {/* ================= MODAL: NEW JOURNAL ENTRY ================= */}
      <Modal
        isOpen={showNewEntryModal}
        onClose={() => setShowNewEntryModal(false)}
        title="Create General Ledger Journal Entry"
        subtitle="Strict double-entry validation: Total Debits MUST exactly match Total Credits"
        maxWidth="3xl"
      >
        <div className="space-y-4">
          {entryError && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/80 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{entryError}</span>
            </div>
          )}

            <form onSubmit={handlePostJournalEntry} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Effective Date</label>
                  <input
                    type="date"
                    value={entryDate || ''}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Entry Memo / Reference</label>
                  <input
                    type="text"
                    value={entryMemo || ''}
                    onChange={(e) => setEntryMemo(e.target.value)}
                    placeholder="e.g. Monthly server capacity expansion accrual"
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400"
                    required
                  />
                </div>
              </div>

              {/* Dynamic Lines Table */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Journal Lines</label>
                <div className="space-y-2">
                  {entryLines.map((line, idx) => (
                    <div key={idx} className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                      <select
                        value={line.accountId || (accounts[0]?.id || '')}
                        onChange={(e) => handleLineChange(idx, 'accountId', e.target.value)}
                        className="w-full sm:w-1/3 px-2 py-1.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-xs text-slate-900 dark:text-white"
                      >
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.code} - {a.name} ({a.category})
                          </option>
                        ))}
                      </select>

                      <input
                        type="text"
                        value={line.description || ''}
                        onChange={(e) => handleLineChange(idx, 'description', e.target.value)}
                        placeholder="Description..."
                        className="w-full sm:w-1/3 px-2 py-1.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-xs text-slate-900 dark:text-white"
                      />

                      <div className="flex items-center gap-2 w-full sm:w-1/3">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={line.debit || ''}
                          onChange={(e) => handleLineChange(idx, 'debit', e.target.value)}
                          placeholder="Debit"
                          className="w-1/2 px-2 py-1.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-xs text-slate-900 dark:text-white font-mono text-right"
                        />
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={line.credit || ''}
                          onChange={(e) => handleLineChange(idx, 'credit', e.target.value)}
                          placeholder="Credit"
                          className="w-1/2 px-2 py-1.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-xs text-slate-900 dark:text-white font-mono text-right"
                        />
                        {entryLines.length > 2 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(idx)}
                            className="text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 p-1"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAddLine}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium flex items-center gap-1 mt-2"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Add Line</span>
                </button>
              </div>

              {/* Balance Verification Bar */}
              <div
                className={`p-3 rounded-xl border flex items-center justify-between text-xs font-semibold ${
                  balanceStatus.balanced
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  {balanceStatus.balanced ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  )}
                  <span>
                    {balanceStatus.balanced
                      ? 'Balanced Entry: Total Debits = Total Credits'
                      : `Out of balance by $${balanceStatus.difference.toFixed(2)}`}
                  </span>
                </div>

                <div className="flex items-center gap-4 font-mono">
                  <span>Debits: ${balanceStatus.totalDebit.toFixed(2)}</span>
                  <span>Credits: ${balanceStatus.totalCredit.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewEntryModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!balanceStatus.balanced}
                  className={`px-5 py-2 rounded-lg text-white text-xs font-semibold transition ${
                    balanceStatus.balanced
                      ? 'bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30'
                      : 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Post to General Ledger
                </button>
              </div>
            </form>
        </div>
      </Modal>
    </div>
  );
};
