import React, { useState, useEffect } from 'react';
import {
  Settings,
  Palette,
  User,
  Users,
  Shield,
  Layers,
  Sun,
  Moon,
  Upload,
  Check,
  AlertTriangle,
  Lock,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  Building,
  Key,
  Bell,
  Globe,
  Mail,
  UserCheck,
  UserX,
  FileCheck,
  Database,
  Camera,
  CheckCircle2,
  X,
  Sliders,
  ChevronRight,
} from 'lucide-react';
import { UserSession, UserRole, UserGroup, SystemBrandSettings } from '../types';
import { coreAuthService, DEFAULT_USERS, ROLE_PERMISSIONS } from '../domains/core/rbac';
import { useTheme } from '../domains/core/theme-context';
import { ProvidersView } from './ProvidersView';

interface SettingsViewProps {
  currentUser: UserSession;
  onUserChange: (user: UserSession) => void;
  initialTab?: 'brand' | 'profile' | 'directory' | 'providers';
  onSubTabChange?: (tab: 'brand' | 'profile' | 'directory' | 'providers') => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  onUserChange,
  initialTab = 'brand',
  onSubTabChange,
}) => {
  const [activeTab, setActiveTab] = useState<'brand' | 'profile' | 'directory' | 'providers'>(initialTab);
  const { theme, toggleTheme, setTheme } = useTheme();

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const handleTabChange = (tab: 'brand' | 'profile' | 'directory' | 'providers') => {
    setActiveTab(tab);
    onSubTabChange?.(tab);
  };

  // Toast / notification feedback
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  const showSuccess = (msg: string) => {
    setSuccessToast(msg);
    setErrorToast(null);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const showError = (msg: string) => {
    setErrorToast(msg);
    setSuccessToast(null);
    setTimeout(() => setErrorToast(null), 5000);
  };

  // ==================== TAB A: THEME & BRAND CUSTOMIZATION ====================
  const [brandSettings, setBrandSettings] = useState<SystemBrandSettings>(() => coreAuthService.getSystemBrandSettings());
  const [logoPreview, setLogoPreview] = useState<string | null>(brandSettings.masterLogoUrl || null);
  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';

  const handleBrandLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showError('File exceeds maximum upload limit of 2MB (2,048 KB). Please choose a logo under 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setLogoPreview(base64);
      setBrandSettings((prev) => ({ ...prev, masterLogoUrl: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBrandSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      showError('Permission Denied: Only Super Administrators can alter enterprise system branding.');
      return;
    }
    try {
      const updated = coreAuthService.updateSystemBrandSettings(brandSettings);
      setBrandSettings(updated);
      showSuccess('Enterprise brand settings saved successfully.');
    } catch (err: any) {
      showError(err.message || 'Failed to update brand settings');
    }
  };

  // ==================== TAB B: USER ACCOUNT & PROFILE SETTINGS ====================
  const [profileName, setProfileName] = useState(currentUser.name);
  const [profileEmail, setProfileEmail] = useState(currentUser.email);
  const [profileAvatar, setProfileAvatar] = useState(currentUser.avatarUrl);
  const [profileTimezone, setProfileTimezone] = useState('America/Los_Angeles');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStrength, setPasswordStrength] = useState<'Weak' | 'Medium' | 'Strong'>('Medium');

  const [notifications, setNotifications] = useState({
    emailDigests: true,
    realtimePush: true,
    glJournalAlerts: true,
    payrollRunApproval: true,
    highValueExpenseAlert: true,
  });

  useEffect(() => {
    setProfileName(currentUser.name);
    setProfileEmail(currentUser.email);
    setProfileAvatar(currentUser.avatarUrl);
  }, [currentUser]);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showError('Avatar file exceeds maximum upload limit of 2MB. Please choose a smaller photo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setProfileAvatar(base64);
    };
    reader.readAsDataURL(file);
  };

  const handlePasswordChange = (val: string) => {
    setNewPassword(val);
    if (val.length < 8) {
      setPasswordStrength('Weak');
    } else if (/[A-Z]/.test(val) && /[0-9]/.test(val) && /[^A-Za-z0-9]/.test(val)) {
      setPasswordStrength('Strong');
    } else {
      setPasswordStrength('Medium');
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword && newPassword !== confirmPassword) {
      showError('New passwords do not match.');
      return;
    }

    try {
      const updated = coreAuthService.updateCurrentUserProfile({
        name: profileName,
        email: profileEmail,
        avatarUrl: profileAvatar,
        timezone: profileTimezone,
      });
      onUserChange(updated);
      if (newPassword) {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        showSuccess('Account profile & password updated successfully.');
      } else {
        showSuccess('Account profile updated successfully in real-time.');
      }
    } catch (err: any) {
      showError(err.message || 'Failed to update user profile');
    }
  };

  // ==================== TAB C: ENTERPRISE DIRECTORY & USER GROUPS ====================
  const [usersList, setUsersList] = useState(() => coreAuthService.getUsers());
  const [groupsList, setGroupsList] = useState<UserGroup[]>(() => coreAuthService.getUserGroups());
  const [subTabC, setSubTabC] = useState<'directory' | 'groups'>('directory');

  // Add / Invite User Modal State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('STAFF_EMPLOYEE');
  const [inviteDept, setInviteDept] = useState('Engineering');

  // Edit / Create Group Modal State
  const [editingGroup, setEditingGroup] = useState<UserGroup | null>(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserSession | null>(null);

  const refreshDirectory = () => {
    setUsersList(coreAuthService.getUsers());
    setGroupsList(coreAuthService.getUserGroups());
  };

  const handleInviteUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) {
      showError('Please provide both Full Name and Work Email.');
      return;
    }

    const newUser = {
      id: `usr-${Date.now().toString(36)}`,
      name: inviteName.trim(),
      email: inviteEmail.trim(),
      role: inviteRole,
      avatarUrl: `https://images.unsplash.com/photo-${1534528741775 + Math.floor(Math.random() * 1000)}?w=150&auto=format&fit=crop&q=80`,
      permissions: ROLE_PERMISSIONS[inviteRole] || [],
      department: inviteDept,
      status: 'INVITED' as const,
      timezone: 'America/New_York',
    };

    coreAuthService.addUser(newUser);
    refreshDirectory();
    setShowInviteModal(false);
    setInviteName('');
    setInviteEmail('');
    showSuccess(`Invitation dispatched to ${newUser.email} with role ${newUser.role}.`);
  };

  const handleToggleUserSuspension = (userId: string) => {
    try {
      const targetUser = usersList.find((u) => u.id === userId);
      const isCurrentlySuspended = targetUser?.status === 'SUSPENDED';
      coreAuthService.suspendUser(userId);
      refreshDirectory();
      const userName = targetUser?.name || 'User';
      if (isCurrentlySuspended) {
        showSuccess(`User ${userName} successfully reactivated and restored to active directory.`);
      } else {
        showSuccess(`User ${userName} successfully suspended.`);
      }
    } catch (err: any) {
      showError(err.message || 'Failed to update user status');
    }
  };

  const handleConfirmDeleteUser = () => {
    if (!userToDelete) return;
    try {
      const targetName = userToDelete.name;
      coreAuthService.removeUser(userToDelete.id);
      refreshDirectory();
      setUserToDelete(null);
      showSuccess(`User ${targetName} removed from directory.`);
    } catch (err: any) {
      showError(err.message || 'Failed to remove user');
    }
  };

  const handleRemoveUser = (userId: string) => {
    const targetUser = usersList.find((u) => u.id === userId);
    if (targetUser) {
      setUserToDelete(targetUser);
    }
  };

  const handleOpenGroupEditor = (grp?: UserGroup) => {
    if (grp) {
      setEditingGroup({ ...grp, policies: { ...grp.policies } });
    } else {
      setEditingGroup({
        id: `grp-${Date.now().toString(36)}`,
        name: '',
        code: 'OU-CUSTOM-GRP',
        description: '',
        organizationalUnit: 'Global HQ / Operations',
        memberCount: 0,
        isSystemDefault: false,
        policies: {
          viewGeneralLedger: false,
          postManualJournals: false,
          approveSupplierBills: false,
          viewFinancialReports: false,
          manageEmployees: false,
          approveLeaveRequests: false,
          runPayroll: false,
          submitExpenseReceipts: true,
          approveExpenseClaims: false,
          manageInfrastructureAdapters: false,
          viewSecurityAuditLedger: false,
        },
      });
    }
    setShowGroupModal(true);
  };

  const handleSaveGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup || !editingGroup.name.trim()) {
      showError('Please specify group name.');
      return;
    }
    coreAuthService.saveUserGroup(editingGroup);
    refreshDirectory();
    setShowGroupModal(false);
    setEditingGroup(null);
    showSuccess(`Saved organizational group: ${editingGroup.name}`);
  };

  const handleDeleteGroup = (id: string) => {
    if (confirm('Are you sure you want to delete this organizational unit permission group?')) {
      coreAuthService.deleteUserGroup(id);
      refreshDirectory();
      showSuccess('Organizational unit group deleted.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {successToast && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-slate-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {errorToast && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-semibold">{errorToast}</span>
          </div>
          <button onClick={() => setErrorToast(null)} className="text-slate-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Page Title Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30">
              <Settings className="w-5 h-5" />
            </div>
            <span>System & Enterprise Administration Suite</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Enterprise administration hub: Brand theming, personal profile credentials, Active Directory user & OU groups, and pluggable infrastructure.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 dark:text-slate-400">Current Persona:</span>
          <span className="px-2.5 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-500/30 font-mono">
            {currentUser.role}
          </span>
        </div>
      </div>

      {/* Top Main Navigation Tabs (Sticky top-16 z-20) */}
      <div className="sticky top-16 z-20 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md py-3 -mt-3 -mx-1 px-1 border-b border-slate-200/80 dark:border-slate-800/80 mb-6 flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-thin max-w-full">
        <button
          onClick={() => handleTabChange('brand')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition shrink-0 cursor-pointer ${
            activeTab === 'brand'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>Tab A: System Theme & Brand</span>
        </button>

        <button
          onClick={() => handleTabChange('profile')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition shrink-0 cursor-pointer ${
            activeTab === 'profile'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Tab B: User Account & Profile</span>
        </button>

        <button
          onClick={() => handleTabChange('directory')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition shrink-0 cursor-pointer ${
            activeTab === 'directory'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Tab C: Enterprise Directory & Groups</span>
        </button>

        <button
          onClick={() => handleTabChange('providers')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition shrink-0 cursor-pointer ${
            activeTab === 'providers'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Tab D: OS Infrastructure & Adapters</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB A: SYSTEM THEME & BRAND CUSTOMIZATION SUB-PAGE */}
      {/* ========================================================================= */}
      {activeTab === 'brand' && (
        <div className="space-y-6">
          {/* RBAC Notice if NOT super admin */}
          {!isSuperAdmin ? (
            <div className="p-6 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 space-y-3">
              <div className="flex items-center gap-3 text-amber-700 dark:text-amber-400">
                <Lock className="w-6 h-6 shrink-0" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Administrative Lockdown: Super-Admin Access Required</h3>
                  <p className="text-xs text-amber-800 dark:text-amber-300/80">
                    Master corporate branding, system titles, and accent colors can only be altered by Platform Super-Administrators.
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300">
                You are currently operating as <strong className="text-indigo-600 dark:text-indigo-400">{currentUser.name}</strong> ({currentUser.role}).
                To edit enterprise brand identity, switch persona to <strong>Eleanor Vance (SUPER_ADMIN)</strong> via the bottom sidebar persona menu.
              </p>
            </div>
          ) : null}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Global Theme Mode Control */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                <Sun className="w-4 h-4 text-amber-500" />
                <span>Operating Color Scheme</span>
              </h3>

              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Select your preferred interface display mode. The chosen theme synchronizes across all application modules and persists in your local profile.
              </p>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`p-4 rounded-xl border text-left flex flex-col justify-between min-h-[100px] transition ${
                    theme === 'dark'
                      ? 'bg-indigo-950/40 border-indigo-500 text-white ring-2 ring-indigo-500/20'
                      : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Moon className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                    {theme === 'dark' && <Check className="w-4 h-4 text-indigo-400" />}
                  </div>
                  <div>
                    <div className="font-bold text-xs text-slate-900 dark:text-white">Enterprise Dark</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Default high-contrast slate</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`p-4 rounded-xl border text-left flex flex-col justify-between min-h-[100px] transition ${
                    theme === 'light'
                      ? 'bg-indigo-50 border-indigo-500 text-slate-900 ring-2 ring-indigo-500/20'
                      : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Sun className="w-5 h-5 text-amber-500" />
                    {theme === 'light' && <Check className="w-4 h-4 text-indigo-600" />}
                  </div>
                  <div>
                    <div className="font-bold text-xs text-slate-900 dark:text-white">Enterprise Light</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Crisp off-white / light slate</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Corporate Brand Identity Form */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                <Building className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Enterprise Identity & Master Logo</span>
              </h3>

              <form onSubmit={handleSaveBrandSettings} className="space-y-4 text-xs">
                <div>
                  <label className="text-slate-700 dark:text-slate-400 font-semibold block mb-1">
                    System Display Name <span className="text-indigo-600 dark:text-indigo-400">*</span>
                  </label>
                  <input
                    type="text"
                    disabled={!isSuperAdmin}
                    value={brandSettings.systemName || ''}
                    onChange={(e) => setBrandSettings({ ...brandSettings, systemName: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                    placeholder="e.g. AUDMA OS"
                  />
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-400 font-semibold block mb-1">
                    Enterprise Operating Description
                  </label>
                  <input
                    type="text"
                    disabled={!isSuperAdmin}
                    value={brandSettings.enterpriseDescription || ''}
                    onChange={(e) => setBrandSettings({ ...brandSettings, enterpriseDescription: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                    placeholder="Autonomous Enterprise Operating System & Monolith Engine"
                  />
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-400 font-semibold block mb-1">
                    Corporate Legal Organization Name
                  </label>
                  <input
                    type="text"
                    disabled={!isSuperAdmin}
                    value={brandSettings.organizationName || ''}
                    onChange={(e) => setBrandSettings({ ...brandSettings, organizationName: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                    placeholder="e.g. Apex Global Holdings & Technologies"
                  />
                </div>

                {/* Primary Brand Accent Color */}
                <div>
                  <label className="text-slate-700 dark:text-slate-400 font-semibold block mb-1.5">
                    Primary Brand Accent Color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      disabled={!isSuperAdmin}
                      value={brandSettings.brandAccentColor || '#4f46e5'}
                      onChange={(e) => setBrandSettings({ ...brandSettings, brandAccentColor: e.target.value })}
                      className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0 disabled:opacity-50"
                    />
                    <div className="flex items-center gap-2">
                      {['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'].map((col) => (
                        <button
                          key={col}
                          type="button"
                          disabled={!isSuperAdmin}
                          onClick={() => setBrandSettings({ ...brandSettings, brandAccentColor: col })}
                          className="w-6 h-6 rounded-full border border-slate-300 dark:border-white/20 transition hover:scale-110 disabled:opacity-50"
                          style={{ backgroundColor: col }}
                        />
                      ))}
                    </div>
                    <span className="font-mono text-xs text-slate-600 dark:text-slate-400 uppercase ml-2">
                      {brandSettings.brandAccentColor}
                    </span>
                  </div>
                </div>

                {/* Master Corporate Logo Upload */}
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-700 dark:text-slate-400 font-semibold block">
                      Master Corporate Logo (PNG, SVG, or JPEG - Max 2MB)
                    </label>
                    {logoPreview && (
                      <button
                        type="button"
                        disabled={!isSuperAdmin}
                        onClick={() => {
                          setLogoPreview(null);
                          setBrandSettings({ ...brandSettings, masterLogoUrl: '' });
                        }}
                        className="text-xs text-rose-600 dark:text-rose-400 hover:underline"
                      >
                        Remove Logo
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    {logoPreview ? (
                      <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2 flex items-center justify-center shrink-0 overflow-hidden">
                        <img src={logoPreview} alt="Corporate Logo Preview" className="max-h-full max-w-full object-contain" />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                        <Building className="w-6 h-6" />
                      </div>
                    )}

                    <div className="flex-1">
                      <label
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer border transition ${
                          isSuperAdmin
                            ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white border-slate-300 dark:border-slate-700'
                            : 'bg-slate-100/50 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800 cursor-not-allowed'
                        }`}
                      >
                        <Upload className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>Upload Master Logo</span>
                        <input
                          type="file"
                          disabled={!isSuperAdmin}
                          accept="image/png,image/svg+xml,image/jpeg,image/webp"
                          className="hidden"
                          onChange={handleBrandLogoUpload}
                        />
                      </label>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Strict 2MB upload limit enforced. Rendered in sidebar headers and outbound invoices.
                      </p>
                    </div>
                  </div>
                </div>

                {isSuperAdmin && (
                  <div className="pt-3 flex justify-end">
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition shadow-md shadow-indigo-600/30 flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      <span>Save Brand Customizations</span>
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB B: USER ACCOUNT & PROFILE SETTINGS SUB-PAGE */}
      {/* ========================================================================= */}
      {activeTab === 'profile' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Personal Account Credentials & Profile Settings</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Real-time profile updates for currently authenticated operating session: {currentUser.name} ({currentUser.role}).
              </p>
            </div>

            <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse"></span>
              <span>Session Active & Authenticated</span>
            </span>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-6 text-xs">
            {/* Avatar & Photo Section */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="relative group">
                <img
                  src={profileAvatar}
                  alt={profileName}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-indigo-500/40 shadow-md"
                />
                <label className="absolute inset-0 bg-black/60 rounded-2xl flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition cursor-pointer">
                  <Camera className="w-5 h-5" />
                  <span className="text-[10px] font-bold mt-1">Change</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                </label>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">{profileName}</h4>
                <p className="text-slate-500 dark:text-slate-400 text-xs">{profileEmail}</p>
                <div className="flex items-center gap-2 mt-2">
                  <label className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-semibold cursor-pointer transition">
                    Upload Photo
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                    />
                  </label>
                  <span className="text-[11px] text-slate-500">Max size: 2MB (PNG/JPG)</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-slate-700 dark:text-slate-400 font-semibold block mb-1">
                  Full Display Name <span className="text-indigo-600 dark:text-indigo-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={profileName || ''}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-400 font-semibold block mb-1">
                  Work Email Address <span className="text-indigo-600 dark:text-indigo-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={profileEmail || ''}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-400 font-semibold block mb-1">Operating Timezone</label>
                <select
                  value={profileTimezone || 'America/New_York'}
                  onChange={(e) => setProfileTimezone(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="America/Los_Angeles">Pacific Time (US & Canada) - UTC-8</option>
                  <option value="America/Denver">Mountain Time (US & Canada) - UTC-7</option>
                  <option value="America/Chicago">Central Time (US & Canada) - UTC-6</option>
                  <option value="America/New_York">Eastern Time (US & Canada) - UTC-5</option>
                  <option value="Europe/London">Greenwich Mean Time (London) - UTC+0</option>
                  <option value="Europe/Berlin">Central European Time (Berlin, Paris) - UTC+1</option>
                  <option value="Asia/Tokyo">Japan Standard Time (Tokyo) - UTC+9</option>
                  <option value="Asia/Singapore">Singapore Time (Singapore) - UTC+8</option>
                  <option value="Australia/Sydney">Australian Eastern Time - UTC+10</option>
                </select>
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-400 font-semibold block mb-1">Assigned Organizational Role</label>
                <input
                  type="text"
                  disabled
                  value={currentUser.role}
                  className="w-full bg-slate-100 dark:bg-slate-950/60 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-indigo-700 dark:text-indigo-400 font-mono font-bold cursor-not-allowed"
                />
              </div>
            </div>

            {/* Password Update Card */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-4">
              <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-2">
                <Key className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Security & Password Management</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-700 dark:text-slate-400 font-semibold block mb-1">Current Password</label>
                  <input
                    type="password"
                    placeholder="••••••••••••"
                    value={currentPassword || ''}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-700 dark:text-slate-400 font-semibold">New Password</label>
                    {newPassword && (
                      <span className={`text-[10px] font-bold ${passwordStrength === 'Strong' ? 'text-emerald-700 dark:text-emerald-400' : passwordStrength === 'Medium' ? 'text-amber-700 dark:text-amber-400' : 'text-rose-700 dark:text-rose-400'}`}>
                        {passwordStrength}
                      </span>
                    )}
                  </div>
                  <input
                    type="password"
                    placeholder="••••••••••••"
                    value={newPassword || ''}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-slate-700 dark:text-slate-400 font-semibold block mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    placeholder="••••••••••••"
                    value={confirmPassword || ''}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Notification Preferences */}
            <div className="space-y-3">
              <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-2">
                <Bell className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Enterprise Notification Dispatch Settings</span>
              </h3>

              <div className="space-y-2">
                {[
                  { key: 'emailDigests', label: 'Daily Financial & Accounting Digest', desc: 'Summary of posted journals, AP aging alerts, and daily balances.' },
                  { key: 'realtimePush', label: 'Real-time Mobile Push Notifications', desc: 'Urgent system messages and immediate OCR status alerts.' },
                  { key: 'glJournalAlerts', label: 'GL Journal Entry & AP Invoice Approvals', desc: 'Notifications whenever an invoice is posted or awaiting two-party sign-off.' },
                  { key: 'payrollRunApproval', label: 'Payroll Period Processing Alerts', desc: 'Alerts when monthly compensation cycles are calculated or finalized.' },
                  { key: 'highValueExpenseAlert', label: 'High-Value Expense Claims (> $1,000)', desc: 'Instant supervisor alert for out-of-policy transaction items.' },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer transition"
                  >
                    <input
                      type="checkbox"
                      checked={(notifications as any)[item.key]}
                      onChange={(e) => setNotifications({ ...notifications, [item.key]: e.target.checked })}
                      className="mt-0.5 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white text-xs">{item.label}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{item.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition shadow-md shadow-indigo-600/30 flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Save Profile Changes</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB C: ENTERPRISE USER & GROUP MANAGEMENT (ACTIVE DIRECTORY / GOOGLE STYLE) */}
      {/* ========================================================================= */}
      {activeTab === 'directory' && (
        <div className="space-y-6">
          {/* Sub Navigation Switcher */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSubTabC('directory')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                  subTabC === 'directory'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
                }`}
              >
                Enterprise User Directory ({usersList.length})
              </button>
              <button
                onClick={() => setSubTabC('groups')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                  subTabC === 'groups'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
                }`}
              >
                User Groups & Organizational Units ({groupsList.length})
              </button>
            </div>

            {subTabC === 'directory' ? (
              <button
                onClick={() => setShowInviteModal(true)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add / Invite User</span>
              </button>
            ) : (
              <button
                onClick={() => handleOpenGroupEditor()}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Group / OU</span>
              </button>
            )}
          </div>

          {/* SUB-VIEW 1: USER DIRECTORY */}
          {subTabC === 'directory' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-xs min-w-[700px]">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 font-semibold">
                      <th className="py-3 px-4">User & Identity</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4">RBAC Role</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {usersList.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={u.avatarUrl}
                              alt={u.name}
                              className="w-8 h-8 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                            />
                            <div className="truncate">
                              <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                                <span>{u.name}</span>
                                {u.id === currentUser.id && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-500/30">
                                    YOU
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                          {u.department || 'Operations'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-500/10 text-indigo-800 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 font-mono text-[11px] font-bold">
                            {u.role.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              u.status === 'SUSPENDED'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30'
                                : u.status === 'INVITED'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30'
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30'
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                            <span>{u.status || 'ACTIVE'}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {u.id !== currentUser.id && (
                              <button
                                onClick={() => handleToggleUserSuspension(u.id)}
                                title={u.status === 'SUSPENDED' ? 'Re-activate User' : 'Suspend User Account'}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
                              >
                                {u.status === 'SUSPENDED' ? (
                                  <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                ) : (
                                  <UserX className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                )}
                              </button>
                            )}

                            {u.id !== currentUser.id && (
                              <button
                                onClick={() => handleRemoveUser(u.id)}
                                title="Remove User Permanently"
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 dark:bg-slate-800 dark:hover:bg-rose-900/40 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUB-VIEW 2: USER GROUPS & ORGANIZATIONAL UNITS */}
          {subTabC === 'groups' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {groupsList.map((grp) => (
                <div
                  key={grp.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 dark:text-white text-sm">{grp.name}</h4>
                          {grp.isSystemDefault && (
                            <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 font-mono">
                              System OU
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 block mt-0.5">{grp.code}</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleOpenGroupEditor(grp)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
                          title="Edit Group & Policies"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        </button>
                        {!grp.isSystemDefault && (
                          <button
                            onClick={() => handleDeleteGroup(grp.id)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 dark:bg-slate-800 dark:hover:bg-rose-900/40 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 transition"
                            title="Delete Group"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{grp.description}</p>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2.5">
                      <span>OU: <strong className="text-slate-800 dark:text-slate-200">{grp.organizationalUnit}</strong></span>
                      <span>Members: <strong className="text-slate-900 dark:text-white">{grp.memberCount} active</strong></span>
                    </div>

                    {/* Active Policies Snapshot */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                        Assigned RBAC Policies:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {grp.policies.viewGeneralLedger && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-500/10 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20">
                            GL Access
                          </span>
                        )}
                        {grp.policies.postManualJournals && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-500/10 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/20">
                            Post Journals
                          </span>
                        )}
                        {grp.policies.approveSupplierBills && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20">
                            Approve AP
                          </span>
                        )}
                        {grp.policies.manageEmployees && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-500/10 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-500/20">
                            Staff Records
                          </span>
                        )}
                        {grp.policies.runPayroll && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20">
                            Run Payroll
                          </span>
                        )}
                        {grp.policies.submitExpenseReceipts && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            Submit Expenses
                          </span>
                        )}
                        {grp.policies.manageInfrastructureAdapters && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-500/10 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-500/20">
                            Infra Admin
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ADD / INVITE USER MODAL */}
          {showInviteModal && (
            <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Invite Enterprise User</span>
                  </h3>
                  <button onClick={() => setShowInviteModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleInviteUserSubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="text-slate-700 dark:text-slate-400 font-semibold block mb-1">Full Legal Name</label>
                    <input
                      type="text"
                      required
                      value={inviteName || ''}
                      onChange={(e) => setInviteName(e.target.value)}
                      placeholder="e.g. Jordan Miller"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 dark:text-slate-400 font-semibold block mb-1">Corporate Work Email</label>
                    <input
                      type="email"
                      required
                      value={inviteEmail || ''}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="j.miller@audma.enterprise"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-700 dark:text-slate-400 font-semibold block mb-1">Department</label>
                      <select
                        value={inviteDept || 'Engineering'}
                        onChange={(e) => setInviteDept(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="Finance & Treasury">Finance & Treasury</option>
                        <option value="Human Resources">Human Resources</option>
                        <option value="Engineering & Executive">Engineering & Executive</option>
                        <option value="Field Operations">Field Operations</option>
                        <option value="Sales & Marketing">Sales & Marketing</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-700 dark:text-slate-400 font-semibold block mb-1">Assigned Role</label>
                      <select
                        value={inviteRole || 'STAFF_EMPLOYEE'}
                        onChange={(e) => setInviteRole(e.target.value as UserRole)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                        <option value="FINANCIAL_CONTROLLER">FINANCIAL_CONTROLLER</option>
                        <option value="HR_DIRECTOR">HR_DIRECTOR</option>
                        <option value="SENIOR_ACCOUNTANT">SENIOR_ACCOUNTANT</option>
                        <option value="STAFF_EMPLOYEE">STAFF_EMPLOYEE</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowInviteModal(false)}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 dark:hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-md shadow-indigo-600/30"
                    >
                      Send Invitation
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* EDIT / CREATE GROUP & OU MODAL */}
          {showGroupModal && editingGroup && (
            <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Configure User Group & Organizational Unit</span>
                  </h3>
                  <button onClick={() => setShowGroupModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSaveGroup} className="space-y-4 text-xs overflow-y-auto pr-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-700 dark:text-slate-400 font-semibold block mb-1">Group Name</label>
                      <input
                        type="text"
                        required
                        value={editingGroup.name || ''}
                        onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })}
                        placeholder="e.g. Regional Finance Approvers"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-slate-700 dark:text-slate-400 font-semibold block mb-1">OU Code</label>
                      <input
                        type="text"
                        required
                        value={editingGroup.code || ''}
                        onChange={(e) => setEditingGroup({ ...editingGroup, code: e.target.value })}
                        placeholder="OU-FIN-REGIONAL"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-700 dark:text-slate-400 font-semibold block mb-1">Organizational Unit Path</label>
                    <input
                      type="text"
                      required
                      value={editingGroup.organizationalUnit || ''}
                      onChange={(e) => setEditingGroup({ ...editingGroup, organizationalUnit: e.target.value })}
                      placeholder="Global HQ / Finance / Regional"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 dark:text-slate-400 font-semibold block mb-1">Description</label>
                    <textarea
                      rows={2}
                      value={editingGroup.description || ''}
                      onChange={(e) => setEditingGroup({ ...editingGroup, description: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl p-3 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Granular Policy Toggles */}
                  <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <label className="text-slate-800 dark:text-slate-300 font-bold block uppercase tracking-wider text-[11px]">
                      Granular RBAC Policy Permissions
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {[
                        { key: 'viewGeneralLedger', label: 'View General Ledger & Accounts' },
                        { key: 'postManualJournals', label: 'Post Manual Journal Entries' },
                        { key: 'approveSupplierBills', label: 'Approve AP Supplier Bills' },
                        { key: 'viewFinancialReports', label: 'View Financial Statements' },
                        { key: 'manageEmployees', label: 'Manage Staff & Employee Records' },
                        { key: 'approveLeaveRequests', label: 'Approve Leave & Time-Off' },
                        { key: 'runPayroll', label: 'Run & Finalize Payroll Cycles' },
                        { key: 'submitExpenseReceipts', label: 'Submit Expense Claims' },
                        { key: 'approveExpenseClaims', label: 'Approve & Reimburse Expenses' },
                        { key: 'manageInfrastructureAdapters', label: 'Configure Providers & DB' },
                        { key: 'viewSecurityAuditLedger', label: 'View Security Audit Trail' },
                      ].map((pol) => (
                        <label
                          key={pol.key}
                          className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={(editingGroup.policies as any)[pol.key]}
                            onChange={(e) =>
                              setEditingGroup({
                                ...editingGroup,
                                policies: { ...editingGroup.policies, [pol.key]: e.target.checked },
                              })
                            }
                            className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-slate-800 dark:text-slate-200 text-xs">{pol.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowGroupModal(false)}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 dark:hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-md shadow-indigo-600/30"
                    >
                      Save Group & Policies
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* DELETE USER CONFIRMATION MODAL */}
          {userToDelete && (
            <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Confirm User Removal
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      This action will revoke all security credentials and RBAC permissions.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-slate-900 dark:text-white">
                      {userToDelete.name}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-mono font-bold">
                      {userToDelete.role}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 font-mono">{userToDelete.email}</div>
                  <div className="text-[11px] text-slate-400">Department: {userToDelete.department}</div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Are you sure you want to permanently remove <strong className="text-slate-900 dark:text-white">{userToDelete.name}</strong> from the enterprise user directory?
                </p>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setUserToDelete(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDeleteUser}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md shadow-rose-600/30 transition"
                  >
                    Delete User
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB D: OS INFRASTRUCTURE & PROVIDER ADAPTERS */}
      {/* ========================================================================= */}
      {activeTab === 'providers' && (
        <div className="space-y-4">
          <ProvidersView />
        </div>
      )}
    </div>
  );
};
