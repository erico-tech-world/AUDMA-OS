import React, { useState, useEffect, useCallback } from 'react';
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
import { authApi } from './lib/api/client';
import { ThemeProvider } from './domains/core/theme-context';
import { UserSession, GranularPermission } from './types';
import { Terminal } from 'lucide-react';
import { Modal } from './components/Modal';

function AppContent() {
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [accountingSubTab, setAccountingSubTab] = useState<'coa' | 'journal' | 'reports' | 'ap'>('journal');
  const [receiptSubTab, setReceiptSubTab] = useState<'capture' | 'inbox' | 'manual' | 'settings'>('inbox');
  const [hrmSubTab, setHrmSubTab] = useState<'payroll' | 'employees' | 'departments' | 'attendance' | 'attendance_config' | 'leave'>('employees');
  const [settingsSubTab, setSettingsSubTab] = useState<'brand' | 'profile' | 'directory' | 'providers'>('brand');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);

  // Load session on mount
  useEffect(() => {
    const loadSession = async () => {
      try {
        const user = await authApi.me();
        setCurrentUser(user);
      } catch {
        // No active session
        setCurrentUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    loadSession();
  }, []);

  const handleLogin = useCallback(async (email: string, password: string) => {
    const apiUser = await authApi.login(email, password);
    const user: UserSession = {
      id: apiUser.id,
      name: apiUser.full_name,
      email: apiUser.email,
      role: apiUser.role as UserSession['role'],
      avatarUrl: `https://images.unsplash.com/photo-${1534528741775 + Math.floor(Math.random() * 1000)}?w=150&auto=format&fit=crop&q=80`,
      permissions: apiUser.permissions as GranularPermission[],
    };
    setCurrentUser(user);
    return user;
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore logout errors
    }
    setCurrentUser(null);
  }, []);

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading session...</p>
        </div>
      </div>
    );
  }

  const handleOpenLogin = () => {
    // In production, show a login modal. For now, prompt via browser.
    const email = prompt('Enter your email:');
    if (!email) return;
    const password = prompt('Enter your password:');
    if (!password) return;
    handleLogin(email, password).catch((err: any) => {
      alert('Login failed: ' + err.error);
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex font-sans selection:bg-indigo-500 selection:text-white antialiased transition-colors duration-200">
      {/* Fixed Left Navigation Sidebar */}
      <Sidebar
        currentUser={currentUser!}
        onUserChange={(user: UserSession) => setCurrentUser(user)}
        activeTab={activeTab}
        activeSubTab={currentSubTab}
        onTabChange={handleNavigate}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onOpenAuditModal={() => setShowAuditModal(true)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onLogin={handleOpenLogin}
        onLogout={handleLogout}
        isAuthenticated={!!currentUser}
      />

      <div
        className={`flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden transition-all duration-300 ${
          isSidebarCollapsed ? 'md:pl-20' : 'md:pl-64'
        }`}
      >
        {/* Global Top Bar */}
        <TopBar
          currentUser={currentUser!}
          activeTab={activeTab}
          activeSubTab={currentSubTab}
          onNavigate={handleNavigate}
          onOpenCommandPalette={() => setShowCommandPalette(true)}
          onToggleSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          onLogin={handleOpenLogin}
          onLogout={handleLogout}
          isAuthenticated={!!currentUser}
        />

        {/* View Canvas */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {!currentUser && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center shadow-sm">
              <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mx-auto mb-6">
                <Terminal className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Authentication Required</h2>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Please sign in to access AUDMA OS. Default admin: <br />
                <span className="font-mono text-indigo-600 dark:text-indigo-400">admin@audma.enterprise</span> / <span className="font-mono text-indigo-600 dark:text-indigo-400">Admin@2026!</span>
              </p>
              <button
                onClick={handleOpenLogin}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-md transition"
              >
                Sign In
              </button>
            </div>
          )}

          {currentUser && activeTab === 'dashboard' && <DashboardView onNavigate={handleNavigate} />}
          {currentUser && activeTab === 'receipts' && (
            <ReceiptTrackerView
              currentUser={currentUser!}
              initialSubView={receiptSubTab}
              onNavigateToGL={() => handleNavigate('accounting', 'journal')}
              onSubTabChange={(st) => handleNavigate('receipts', st)}
            />
          )}
          {currentUser && activeTab === 'accounting' && (
            <AccountingView
              initialSubTab={accountingSubTab}
              subTabOverride={accountingSubTab}
              onSubTabChange={(st) => handleNavigate('accounting', st)}
            />
          )}
          {currentUser && activeTab === 'ai-invoice' && <AIInvoiceView />}
          {currentUser && activeTab === 'hrm' && (
            <HRMView
              initialSubTab={hrmSubTab}
              subTabOverride={hrmSubTab}
              onSubTabChange={(st) => handleNavigate('hrm', st)}
            />
          )}
          {currentUser && activeTab === 'providers' && <ProvidersView />}
          {currentUser && activeTab === 'settings' && (
            <SettingsView
              currentUser={currentUser!}
              onUserChange={(user: UserSession) => setCurrentUser(user)}
              initialTab={settingsSubTab}
              onSubTabChange={(st) => handleNavigate('settings', st)}
            />
          )}
        </main>

        <footer className="bg-white/90 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 py-3 mt-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-center sm:text-left">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-slate-800 dark:text-slate-300 font-medium">AUDMA OS Production</span>
              <span>•</span>
              <span className="font-mono text-[11px] text-slate-500">PostgreSQL + Session Auth</span>
            </div>
            <div className="flex items-center gap-3">
              {currentUser && (
                <>
                  <button
                    onClick={() => setShowAuditModal(true)}
                    className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
                  >
                    <Terminal className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                    <span>Audit Trail</span>
                  </button>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <span className="text-slate-500 text-[11px]">
                    Active Persona: <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{currentUser.role}</span>
                  </span>
                </>
              )}
            </div>
          </div>
        </footer>
      </div>

      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        onNavigate={handleNavigate}
      />

      <Modal
        isOpen={showAuditModal}
        onClose={() => setShowAuditModal(false)}
        title={
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            <span>System Audit Trail</span>
          </div>
        }
        subtitle="Server-side audit log from PostgreSQL"
        maxWidth="4xl"
      >
        <div className="space-y-4 text-xs">
          <div className="text-center py-10 text-slate-500">
            Audit logs are fetched from the server-side PostgreSQL audit_logs table.
            <br />
            <button onClick={() => handleNavigate('settings', 'directory')} className="text-indigo-600 hover:underline">
              Click here to load
            </button>
          </div>
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
