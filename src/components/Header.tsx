import React from 'react';
import {
  Layers,
  Database,
  HardDrive,
  Sparkles,
  Workflow,
  ShieldCheck,
  ChevronDown,
  Globe,
  Activity,
  UserCheck,
} from 'lucide-react';
import { UserSession } from '../types';
import { DEFAULT_USERS, coreAuthService } from '../domains/core/rbac';
import { ProviderFactory } from '../providers/factory';
import { getBaseUrl } from '../lib/base-url';

interface HeaderProps {
  currentUser: UserSession;
  onUserChange: (user: UserSession) => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onUserChange,
  activeTab,
  onTabChange,
}) => {
  const [showUserDropdown, setShowUserDropdown] = React.useState(false);
  const baseUrl = getBaseUrl();
  const factory = ProviderFactory.getInstance();
  const config = factory.getConfig();

  const handleSelectUser = (id: string) => {
    const updated = coreAuthService.setCurrentUser(id);
    onUserChange(updated);
    setShowUserDropdown(false);
  };

  const navItems = [
    { id: 'dashboard', label: 'Executive Overview' },
    { id: 'accounting', label: 'General Ledger & AP' },
    { id: 'ai-invoice', label: 'AI Invoice OCR Audit' },
    { id: 'hrm', label: 'HRM & Payroll' },
    { id: 'providers', label: 'Provider Architecture' },
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40">
      {/* Top utility bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Modular Monolith Core: Online</span>
          </div>

          <div className="hidden sm:flex items-center gap-1 text-slate-400 border-l border-slate-700 pl-3">
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-300 font-mono truncate max-w-[260px]">{baseUrl}</span>
            <span className="text-emerald-400 font-semibold text-[10px] bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.5 rounded">
              Auto-Detected
            </span>
          </div>
        </div>

        {/* Active Providers Micro-Badges */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onTabChange('providers')}
            className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700 transition"
            title="Database Provider"
          >
            <Database className="w-3 h-3 text-cyan-400" />
            <span className="font-mono capitalize text-[11px]">DB: {config.dbProvider.replace('_', ' ')}</span>
          </button>

          <button
            onClick={() => onTabChange('providers')}
            className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700 transition"
            title="Storage Provider"
          >
            <HardDrive className="w-3 h-3 text-amber-400" />
            <span className="font-mono capitalize text-[11px]">S3: {config.storageProvider.replace('_', ' ')}</span>
          </button>

          <button
            onClick={() => onTabChange('providers')}
            className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700 transition"
            title="AI Engine"
          >
            <Sparkles className="w-3 h-3 text-purple-400" />
            <span className="font-mono capitalize text-[11px]">AI: {config.aiProvider.replace('_', ' ')}</span>
          </button>

          <button
            onClick={() => onTabChange('providers')}
            className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700 transition"
            title="Event Bus Queue"
          >
            <Workflow className="w-3 h-3 text-rose-400" />
            <span className="font-mono capitalize text-[11px]">Queue: {config.queueProvider}</span>
          </button>
        </div>
      </div>

      {/* Main navigation header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onTabChange('dashboard')}>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 font-bold tracking-wider">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-white">AUDMA OS</span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Enterprise
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-none">
                Modular HRM & Double-Entry Financial Monolith
              </p>
            </div>
          </div>

          {/* Navigation links */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-${item.id}`}
                  onClick={() => onTabChange(item.id)}
                  className={`px-3.5 py-2 rounded-md text-sm font-medium transition-colors ${
                    active
                      ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* User Session & RBAC Switcher */}
          <div className="relative">
            <button
              id="user-profile-button"
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700/90 border border-slate-700 text-left transition"
            >
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                className="w-8 h-8 rounded-full object-cover border border-slate-600"
              />
              <div className="hidden sm:block">
                <div className="text-xs font-semibold text-white leading-tight flex items-center gap-1">
                  {currentUser.name}
                  <ShieldCheck className="w-3 h-3 text-indigo-400" />
                </div>
                <div className="text-[10px] text-slate-400 capitalize">
                  {currentUser.role.replace(/_/g, ' ').toLowerCase()}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Role Switcher Dropdown */}
            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-72 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-2 border-b border-slate-700 text-xs text-slate-400">
                  <span className="font-semibold text-slate-200">Switch Active RBAC Persona</span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Test role-based access control and granular permission barriers
                  </p>
                </div>

                <div className="py-1 max-h-80 overflow-y-auto">
                  {DEFAULT_USERS.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleSelectUser(user.id)}
                      className={`w-full px-3 py-2 flex items-center gap-3 text-left hover:bg-slate-700/60 transition ${
                        user.id === currentUser.id ? 'bg-indigo-600/20 text-indigo-300' : 'text-slate-200'
                      }`}
                    >
                      <img
                        src={user.avatarUrl}
                        alt={user.name}
                        className="w-7 h-7 rounded-full object-cover border border-slate-600"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{user.name}</div>
                        <div className="text-[10px] text-slate-400">{user.role.replace(/_/g, ' ')}</div>
                      </div>
                      {user.id === currentUser.id && (
                        <UserCheck className="w-4 h-4 text-indigo-400 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>

                <div className="px-3 pt-2 border-t border-slate-700 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Permissions: {currentUser.permissions.length} active</span>
                  <span className="text-emerald-400 font-mono text-[10px]">RBAC Enforced</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Tab Bar */}
        <div className="lg:hidden flex items-center space-x-1 overflow-x-auto py-2 border-t border-slate-800">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`px-3 py-1.5 whitespace-nowrap rounded text-xs font-medium ${
                activeTab === item.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};
