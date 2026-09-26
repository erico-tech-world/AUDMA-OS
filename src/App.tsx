import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { CommandPalette } from './components/CommandPalette';
import { DashboardView } from './components/DashboardView';
import { ReceiptTrackerView } from './components/ReceiptTrackerView';
import { AccountingView } from './components/AccountingView';
import { AIInvoiceView } from './components/AIInvoiceView';
import { HRMView } from './components/HRMView';
import { ProvidersView } from './components/ProvidersView';
import { SettingsView } from './components/SettingsView';
import { coreAuthService } from './domains/core/rbac';
import { ThemeProvider } from './domains/core/theme-context';
import { UserSession } from './types';
import { Terminal } from 'lucide-react';
import { Modal } from './components/Modal';

function AppContent() {
  const [currentUser, setCurrentUser] = useState<UserSession>(coreAuthService.getCurrentUser());
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [accountingSubTab, setAccountingSubTab] = useState<'coa' | 'journal' | 'reports' | 'ap'>('journal');
  const [receiptSubTab, setReceiptSubTab] = useState<'capture' | 'inbox' | 'manual' | 'settings'>('inbox');
  const [hrmSubTab, setHrmSubTab] = useState<'payroll' | 'employees' | 'departments' | 'attendance' | 'attendance_config' | 'leave'>('employees');
  const [settingsSubTab, setSettingsSubTab] = useState<'brand' | 'profile' | 'directory' | 'providers'>('brand');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);

  const auditLogs = coreAuthService.getAuditLogs();

  const handleNavigate = (tab: string, subTab?: string) => {
    setActiveTab(tab);
    if (tab === 'accounting' && subTab) {
      setAccountingSubTab(subTab as 'coa' | 'journal' | 'reports' | 'ap');
    }
    if (tab === 'receipts' && subTab) {
      setReceiptSubTab(subTab as 'capture' | 'inbox' | 'manual' | 'settings');
    }
    if (tab === 'hrm' && subTab) {
      setHrmSubTab(subTab as 'payroll' | 'employees' | 'departments' | 'attendance' | 'attendance_config' | 'leave');
    }
    if (tab === 'settings' && subTab) {
      setSettingsSubTab(subTab as 'brand' | 'profile' | 'directory' | 'providers');
    }
    // Close mobile drawer upon navigating
    setIsMobileSidebarOpen(false);
  };

  const currentSubTab =
    activeTab === 'accounting'
      ? accountingSubTab
      : activeTab === 'receipts'
      ? receiptSubTab
      : activeTab === 'hrm'
      ? hrmSubTab
      : activeTab === 'settings'
      ? settingsSubTab
      : undefined;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex font-sans selection:bg-indigo-500 selection:text-white antialiased transition-colors duration-200">
      {/* Fixed Left Navigation Sidebar (with Mobile Slide-Out Drawer) */}
      <Sidebar
        currentUser={currentUser}
        onUserChange={setCurrentUser}
        activeTab={activeTab}
        activeSubTab={currentSubTab}
        onTabChange={handleNavigate}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onOpenAuditModal={() => setShowAuditModal(true)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Layout Container with dynamic left padding to ensure content never slips under the fixed sidebar */}
      <div
        className={`flex-1 flex flex-col min-w-0 min-h-screen overflow-x-clip transition-all duration-300 ${
          isSidebarCollapsed ? 'md:pl-20' : 'md:pl-64'
        }`}
      >
        {/* Global Top Bar */}
        <TopBar
          currentUser={currentUser}
          activeTab={activeTab}
          activeSubTab={currentSubTab}
          onNavigate={handleNavigate}
          onOpenCommandPalette={() => setShowCommandPalette(true)}
          onToggleSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />

        {/* View Canvas */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {activeTab === 'dashboard' && <DashboardView onNavigate={handleNavigate} />}
          {activeTab === 'receipts' && (
            <ReceiptTrackerView
              currentUser={currentUser}
              initialSubView={receiptSubTab}
              onNavigateToGL={() => handleNavigate('accounting', 'journal')}
              onSubTabChange={(st) => handleNavigate('receipts', st)}
            />
          )}
          {activeTab === 'accounting' && (
            <AccountingView
              initialSubTab={accountingSubTab}
              subTabOverride={accountingSubTab}
              onSubTabChange={(st) => handleNavigate('accounting', st)}
            />
          )}
          {activeTab === 'ai-invoice' && <AIInvoiceView />}
          {activeTab === 'hrm' && (
            <HRMView
              initialSubTab={hrmSubTab}
              subTabOverride={hrmSubTab}
              onSubTabChange={(st) => handleNavigate('hrm', st)}
            />
          )}
          {activeTab === 'providers' && <ProvidersView />}
          {activeTab === 'settings' && (
            <SettingsView
              currentUser={currentUser}
              onUserChange={setCurrentUser}
              initialTab={settingsSubTab}
              onSubTabChange={(st) => handleNavigate('settings', st)}
            />
          )}
        </main>

        {/* Global Enterprise Monolith Status Footer */}
        <footer className="bg-white/90 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 py-3 mt-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-center sm:text-left">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-slate-800 dark:text-slate-300 font-medium">AUDMA OS Modular Monolith</span>
              <span>•</span>
              <span className="text-slate-500">Domain Boundaries Enforced</span>
              <span>•</span>
              <span className="font-mono text-[11px] text-slate-500">IEEE-754 Safe (Decimal.js)</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAuditModal(true)}
                className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
              >
                <Terminal className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                <span>Audit Trail ({auditLogs.length} Events)</span>
              </button>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <span className="text-slate-500 text-[11px]">
                Active Persona: <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{currentUser.role}</span>
              </span>
            </div>
          </div>
        </footer>
      </div>

      {/* Global Command Palette (Cmd + K / Ctrl + K) */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        onNavigate={handleNavigate}
      />

      {/* Full Audit Trail Modal (Uses Universal Modal component with backdrop click & Esc) */}
      <Modal
        isOpen={showAuditModal}
        onClose={() => setShowAuditModal(false)}
        title={
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            <span>System Audit Trail & Security Ledger</span>
          </div>
        }
        subtitle="Cryptographically verified event sequence recorded by the modular monolith event bus"
        maxWidth="4xl"
      >
        <div className="space-y-4 text-xs">
          {auditLogs.length === 0 ? (
            <div className="text-center py-10 text-slate-500">No audit records logged yet.</div>
          ) : (
            <div className="w-full overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs min-w-[650px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold bg-slate-50 dark:bg-slate-950/80">
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Actor</th>
                    <th className="py-2.5 px-3">Domain</th>
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 text-slate-800 dark:text-slate-200">
                      <td className="py-2.5 px-3 font-mono text-[10px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap">{log.actor}</td>
                      <td className="py-2.5 px-3">
                        <span className="text-[10px] font-mono text-slate-700 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-1.5 py-0.5 rounded">
                          {log.domain}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-[10px] font-mono text-indigo-700 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/40 px-1.5 py-0.5 rounded font-bold">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 text-xs">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
