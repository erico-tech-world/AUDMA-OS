import { UserRole, GranularPermission, UserSession, AuditLog, UserGroup, SystemBrandSettings } from '../../types';

export const ROLE_PERMISSIONS: Record<UserRole, GranularPermission[]> = {
  SUPER_ADMIN: [
    'accounting:view',
    'accounting:post_journal',
    'accounting:approve_invoice',
    'accounting:view_reports',
    'hrm:view',
    'hrm:manage_employees',
    'hrm:approve_leave',
    'hrm:run_payroll',
    'hrm:shift_signoff',
    'receipts:view',
    'receipts:submit',
    'receipts:approve',
    'admin:providers',
    'admin:audit_logs',
    'hod:vendor_po_approval',
    'hod:infrastructure_budget',
    'hod:payroll_signoff',
    'hod:workforce_planning',
    'hod:gl_posting_signoff',
    'hod:leave_approval',
    'hod:expense_review',
    'hod:shift_signoff',
  ],
  FINANCIAL_CONTROLLER: [
    'accounting:view',
    'accounting:post_journal',
    'accounting:approve_invoice',
    'accounting:view_reports',
    'hrm:view',
    'receipts:view',
    'receipts:submit',
    'receipts:approve',
    'admin:audit_logs',
    'hod:vendor_po_approval',
    'hod:gl_posting_signoff',
    'hod:expense_review',
  ],
  HR_DIRECTOR: [
    'hrm:view',
    'hrm:manage_employees',
    'hrm:approve_leave',
    'hrm:run_payroll',
    'hrm:shift_signoff',
    'receipts:view',
    'receipts:submit',
    'admin:audit_logs',
    'hod:payroll_signoff',
    'hod:workforce_planning',
    'hod:leave_approval',
    'hod:shift_signoff',
  ],
  DEPARTMENT_HEAD: [
    'hrm:view',
    'hrm:approve_leave',
    'receipts:view',
    'receipts:submit',
    'receipts:approve',
    'hod:vendor_po_approval',
    'hod:infrastructure_budget',
    'hod:payroll_signoff',
    'hod:workforce_planning',
    'hod:gl_posting_signoff',
    'hod:leave_approval',
    'hod:expense_review',
    'hod:shift_signoff',
  ],
  SENIOR_ACCOUNTANT: [
    'accounting:view',
    'accounting:post_journal',
    'accounting:approve_invoice',
    'accounting:view_reports',
    'receipts:view',
    'receipts:submit',
    'receipts:approve',
  ],
  STAFF_EMPLOYEE: [
    'hrm:view',
    'receipts:view',
    'receipts:submit',
  ],
};

export const DEFAULT_USERS: (UserSession & { department?: string; status?: 'ACTIVE' | 'SUSPENDED' | 'INVITED'; timezone?: string })[] = [
  {
    id: 'usr-1',
    name: 'Eleanor Vance',
    email: 'eleanor.vance@audma.enterprise',
    role: 'SUPER_ADMIN',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    permissions: ROLE_PERMISSIONS.SUPER_ADMIN,
    department: 'Engineering & Executive',
    status: 'ACTIVE',
    timezone: 'America/Los_Angeles',
  },
  {
    id: 'usr-2',
    name: 'Marcus Sterling',
    email: 'm.sterling@audma.enterprise',
    role: 'FINANCIAL_CONTROLLER',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    permissions: ROLE_PERMISSIONS.FINANCIAL_CONTROLLER,
    department: 'Finance & Treasury',
    status: 'ACTIVE',
    timezone: 'America/New_York',
  },
  {
    id: 'usr-3',
    name: 'Amara Chen',
    email: 'amara.chen@audma.enterprise',
    role: 'HR_DIRECTOR',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    permissions: ROLE_PERMISSIONS.HR_DIRECTOR,
    department: 'Human Resources',
    status: 'ACTIVE',
    timezone: 'Europe/London',
  },
  {
    id: 'usr-4',
    name: 'Devon Hayes',
    email: 'devon.h@audma.enterprise',
    role: 'SENIOR_ACCOUNTANT',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    permissions: ROLE_PERMISSIONS.SENIOR_ACCOUNTANT,
    department: 'Finance & Treasury',
    status: 'ACTIVE',
    timezone: 'America/Chicago',
  },
  {
    id: 'usr-5',
    name: 'Kavita Patel',
    email: 'kavita.p@audma.enterprise',
    role: 'STAFF_EMPLOYEE',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    permissions: ROLE_PERMISSIONS.STAFF_EMPLOYEE,
    department: 'Field Operations',
    status: 'ACTIVE',
    timezone: 'Asia/Kolkata',
  },
  {
    id: 'usr-6',
    name: 'Tariq Al-Mansoor',
    email: 'tariq.m@audma.enterprise',
    role: 'DEPARTMENT_HEAD',
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
    permissions: ROLE_PERMISSIONS.DEPARTMENT_HEAD,
    department: 'Software Engineering & Cloud',
    status: 'ACTIVE',
    timezone: 'America/Los_Angeles',
  },
];

export const DEFAULT_USER_GROUPS: UserGroup[] = [
  {
    id: 'grp-fin-admins',
    name: 'Finance Admins & Approvers',
    code: 'OU-FIN-APPROVERS',
    description: 'Corporate treasury, GL journal posting, AP supplier bill approval, and financial statement analysis.',
    organizationalUnit: 'Global HQ / Finance & Treasury',
    memberCount: 2,
    isSystemDefault: true,
    policies: {
      viewGeneralLedger: true,
      postManualJournals: true,
      approveSupplierBills: true,
      viewFinancialReports: true,
      manageEmployees: false,
      approveLeaveRequests: false,
      runPayroll: false,
      submitExpenseReceipts: true,
      approveExpenseClaims: true,
      manageInfrastructureAdapters: false,
      viewSecurityAuditLedger: true,
    },
  },
  {
    id: 'grp-hr-admins',
    name: 'HR Admins & People Ops',
    code: 'OU-HR-OPERATIONS',
    description: 'Employee onboarding, staff records, leave request approvals, attendance shift config, and payroll disbursement.',
    organizationalUnit: 'Global HQ / People & Talent',
    memberCount: 1,
    isSystemDefault: true,
    policies: {
      viewGeneralLedger: false,
      postManualJournals: false,
      approveSupplierBills: false,
      viewFinancialReports: false,
      manageEmployees: true,
      approveLeaveRequests: true,
      runPayroll: true,
      submitExpenseReceipts: true,
      approveExpenseClaims: true,
      manageInfrastructureAdapters: false,
      viewSecurityAuditLedger: true,
    },
  },
  {
    id: 'grp-field-techs',
    name: 'Field Technicians & Specialists',
    code: 'OU-OPS-FIELDTECH',
    description: 'On-site technical support, route logistics, field receipts capture, and timeclock logging.',
    organizationalUnit: 'Field Operations / Logistics',
    memberCount: 12,
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
  },
  {
    id: 'grp-exec-board',
    name: 'Executive Board & Governance',
    code: 'OU-EXEC-BOARD',
    description: 'Full strategic visibility across financial balance sheets, audit trail ledgers, and enterprise infrastructure.',
    organizationalUnit: 'Executive Office / Board of Directors',
    memberCount: 4,
    isSystemDefault: true,
    policies: {
      viewGeneralLedger: true,
      postManualJournals: false,
      approveSupplierBills: true,
      viewFinancialReports: true,
      manageEmployees: true,
      approveLeaveRequests: true,
      runPayroll: true,
      submitExpenseReceipts: true,
      approveExpenseClaims: true,
      manageInfrastructureAdapters: true,
      viewSecurityAuditLedger: true,
    },
  },
  {
    id: 'grp-members',
    name: 'Members & General Staff',
    code: 'OU-CORP-MEMBERS',
    description: 'Standard enterprise access for self-service leave requests, receipt claims, and shift clock-ins.',
    organizationalUnit: 'General Enterprise / All Staff',
    memberCount: 48,
    isSystemDefault: true,
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
  },
];

export const DEFAULT_BRAND_SETTINGS: SystemBrandSettings = {
  systemName: 'AUDMA OS',
  enterpriseDescription: 'Autonomous Enterprise Operating System & Monolith Engine',
  brandAccentColor: '#4f46e5',
  masterLogoUrl: '',
  organizationName: 'Apex Global Holdings & Technologies',
};

class CoreAuthService {
  private users: (UserSession & { department?: string; status?: 'ACTIVE' | 'SUSPENDED' | 'INVITED'; timezone?: string })[] = [...DEFAULT_USERS];
  private currentUser: UserSession = this.users[0];
  private userGroups: UserGroup[] = [...DEFAULT_USER_GROUPS];
  private brandSettings: SystemBrandSettings = { ...DEFAULT_BRAND_SETTINGS };
  private auditLogs: AuditLog[] = [
    {
      id: 'log-1',
      timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
      actor: 'Eleanor Vance (SUPER_ADMIN)',
      action: 'SYSTEM_BOOT',
      domain: 'CORE',
      details: 'AUDMA OS Modular Monolith initialized with Neon DB and Cloudflare R2 adapters',
    },
    {
      id: 'log-2',
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      actor: 'Marcus Sterling (FINANCIAL_CONTROLLER)',
      action: 'COA_AUDIT',
      domain: 'ACCOUNTING',
      details: 'Chart of Accounts verified and balanced across 5 canonical ledgers',
    },
  ];

  constructor() {
    this.loadState();
  }

  private loadState() {
    try {
      const savedBrand = localStorage.getItem('audma_brand_settings');
      if (savedBrand) {
        this.brandSettings = { ...DEFAULT_BRAND_SETTINGS, ...JSON.parse(savedBrand) };
      }
      const savedUsers = localStorage.getItem('audma_directory_users');
      if (savedUsers) {
        this.users = JSON.parse(savedUsers);
        const currentFound = this.users.find(u => u.id === this.currentUser.id);
        if (currentFound) {
          this.currentUser = { ...currentFound };
        }
      }
      const savedGroups = localStorage.getItem('audma_user_groups');
      if (savedGroups) {
        this.userGroups = JSON.parse(savedGroups);
      }
    } catch {
      // Ignore storage errors in restricted contexts
    }
  }

  private saveState() {
    try {
      localStorage.setItem('audma_brand_settings', JSON.stringify(this.brandSettings));
      localStorage.setItem('audma_directory_users', JSON.stringify(this.users));
      localStorage.setItem('audma_user_groups', JSON.stringify(this.userGroups));
    } catch {
      // Ignore storage errors
    }
  }

  getCurrentUser(): UserSession {
    return { ...this.currentUser };
  }

  setCurrentUser(userId: string): UserSession {
    const found = this.users.find((u) => u.id === userId);
    if (found) {
      this.currentUser = { ...found };
      this.logAction(
        this.currentUser.name,
        'SWITCH_USER_CONTEXT',
        'CORE',
        `Switched active user session to ${found.name} (${found.role})`
      );
    }
    return this.getCurrentUser();
  }

  updateCurrentUserProfile(updates: Partial<UserSession & { timezone?: string }>): UserSession {
    this.currentUser = { ...this.currentUser, ...updates };
    this.users = this.users.map((u) => (u.id === this.currentUser.id ? { ...u, ...updates } : u));
    this.saveState();
    this.logAction(
      this.currentUser.name,
      'UPDATE_USER_PROFILE',
      'CORE',
      `Updated personal account profile for ${this.currentUser.name}`
    );
    return this.getCurrentUser();
  }

  getUsers(): (UserSession & { department?: string; status?: 'ACTIVE' | 'SUSPENDED' | 'INVITED'; timezone?: string })[] {
    return [...this.users];
  }

  addUser(user: UserSession & { department?: string; status?: 'ACTIVE' | 'SUSPENDED' | 'INVITED'; timezone?: string }): UserSession {
    this.users.unshift(user);
    this.saveState();
    this.logAction(
      this.currentUser.name,
      'USER_DIRECTORY_INVITE',
      'CORE',
      `Invited new enterprise user: ${user.name} (${user.email}) with role ${user.role}`
    );
    return user;
  }

  updateUser(id: string, updates: Partial<UserSession & { department?: string; status?: 'ACTIVE' | 'SUSPENDED' | 'INVITED'; timezone?: string }>): void {
    this.users = this.users.map((u) => (u.id === id ? { ...u, ...updates } : u));
    if (this.currentUser.id === id) {
      this.currentUser = { ...this.currentUser, ...updates };
    }
    this.saveState();
    this.logAction(
      this.currentUser.name,
      'USER_DIRECTORY_UPDATE',
      'CORE',
      `Updated enterprise user directory record for ID: ${id}`
    );
  }

  suspendUser(id: string): void {
    this.users = this.users.map((u) => {
      if (u.id === id) {
        const nextStatus = u.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
        return { ...u, status: nextStatus };
      }
      return u;
    });
    this.saveState();
    this.logAction(
      this.currentUser.name,
      'USER_DIRECTORY_STATUS_CHANGE',
      'CORE',
      `Toggled suspension status for user ID: ${id}`
    );
  }

  removeUser(id: string): void {
    if (this.currentUser.id === id) {
      throw new Error("Cannot delete currently active logged-in user.");
    }
    this.users = this.users.filter((u) => u.id !== id);
    this.saveState();
    this.logAction(
      this.currentUser.name,
      'USER_DIRECTORY_REMOVE',
      'CORE',
      `Permanently removed user ID: ${id} from corporate directory`
    );
  }

  getUserGroups(): UserGroup[] {
    return [...this.userGroups];
  }

  saveUserGroup(group: UserGroup): void {
    const idx = this.userGroups.findIndex((g) => g.id === group.id);
    if (idx >= 0) {
      this.userGroups[idx] = { ...group };
    } else {
      this.userGroups.push(group);
    }
    this.saveState();
    this.logAction(
      this.currentUser.name,
      'RBAC_GROUP_SAVED',
      'CORE',
      `Saved configuration for organizational unit group: ${group.name} (${group.code})`
    );
  }

  deleteUserGroup(id: string): void {
    this.userGroups = this.userGroups.filter((g) => g.id !== id);
    this.saveState();
    this.logAction(
      this.currentUser.name,
      'RBAC_GROUP_DELETED',
      'CORE',
      `Deleted organizational unit group ID: ${id}`
    );
  }

  getSystemBrandSettings(): SystemBrandSettings {
    return { ...this.brandSettings };
  }

  updateSystemBrandSettings(settings: Partial<SystemBrandSettings>): SystemBrandSettings {
    if (this.currentUser.role !== 'SUPER_ADMIN') {
      throw new Error("Permission Denied: Only Super Administrators can alter enterprise system branding.");
    }
    this.brandSettings = { ...this.brandSettings, ...settings };
    this.saveState();
    this.logAction(
      this.currentUser.name,
      'SYSTEM_BRAND_CUSTOMIZED',
      'CORE',
      `Updated enterprise brand settings: Name: ${this.brandSettings.systemName}, Accent: ${this.brandSettings.brandAccentColor}`
    );
    return { ...this.brandSettings };
  }

  hasPermission(permission: GranularPermission): boolean {
    return this.currentUser.permissions.includes(permission);
  }

  logAction(actor: string, action: string, domain: 'CORE' | 'ACCOUNTING' | 'HRM' | 'PROVIDERS', details: string): AuditLog {
    const log: AuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      actor,
      action,
      domain,
      details,
    };
    this.auditLogs.unshift(log);
    if (this.auditLogs.length > 200) {
      this.auditLogs.pop();
    }
    return log;
  }

  getAuditLogs(): AuditLog[] {
    return [...this.auditLogs];
  }
}

export const coreAuthService = new CoreAuthService();

