import {
  ChartAccount,
  JournalEntry,
  JournalLine,
  Vendor,
  VendorInvoice,
  PurchaseOrder,
  APAgingBucket,
  VendorAgingSummary,
} from '../../types';
import { Decimal, toDecimal, isBalanced } from '../../lib/math';
import { coreAuthService } from '../core/rbac';

export const INITIAL_CHART_OF_ACCOUNTS: ChartAccount[] = [
  // ASSETS (1000 - 1999)
  {
    id: 'acc-1010',
    code: '1010',
    name: 'Operating Cash & Bank Account',
    category: 'ASSET',
    description: 'Primary corporate treasury account (JPMorgan Chase)',
    currentBalance: '345800.00',
    normalBalance: 'DEBIT',
    isActive: true,
  },
  {
    id: 'acc-1020',
    code: '1020',
    name: 'Accounts Receivable (A/R)',
    category: 'ASSET',
    description: 'Outstanding customer enterprise contracts',
    currentBalance: '84200.00',
    normalBalance: 'DEBIT',
    isActive: true,
  },
  {
    id: 'acc-1500',
    code: '1500',
    name: 'Office & IT Equipment Asset',
    category: 'ASSET',
    description: 'Workstations, servers, displays, capital hardware',
    currentBalance: '46500.00',
    normalBalance: 'DEBIT',
    isActive: true,
  },
  // LIABILITIES (2000 - 2999)
  {
    id: 'acc-2010',
    code: '2010',
    name: 'Accounts Payable (A/P)',
    category: 'LIABILITY',
    description: 'Outstanding vendor invoices and supplier obligations',
    currentBalance: '19450.00',
    normalBalance: 'CREDIT',
    isActive: true,
  },
  {
    id: 'acc-2100',
    code: '2100',
    name: 'Payroll Tax Withholding Payable',
    category: 'LIABILITY',
    description: 'Federal & State tax withheld from employee payroll',
    currentBalance: '9420.00',
    normalBalance: 'CREDIT',
    isActive: true,
  },
  {
    id: 'acc-2110',
    code: '2110',
    name: 'Accrued Pension & Benefits Liability',
    category: 'LIABILITY',
    description: 'Mandatory 401(k) and retirement match obligations',
    currentBalance: '3150.00',
    normalBalance: 'CREDIT',
    isActive: true,
  },
  // EQUITY (3000 - 3999)
  {
    id: 'acc-3010',
    code: '3010',
    name: 'Paid-in Capital & Equity',
    category: 'EQUITY',
    description: 'Founder and Series A equity investments',
    currentBalance: '350000.00',
    normalBalance: 'CREDIT',
    isActive: true,
  },
  {
    id: 'acc-3020',
    code: '3020',
    name: 'Retained Earnings',
    category: 'EQUITY',
    description: 'Accumulated net operational profits from prior fiscal years',
    currentBalance: '62480.00',
    normalBalance: 'CREDIT',
    isActive: true,
  },
  // REVENUE (4000 - 4999)
  {
    id: 'acc-4010',
    code: '4010',
    name: 'Enterprise Subscription Revenue',
    category: 'REVENUE',
    description: 'Recurring monthly & annual platform licenses',
    currentBalance: '124000.00',
    normalBalance: 'CREDIT',
    isActive: true,
  },
  {
    id: 'acc-4020',
    code: '4020',
    name: 'Professional & Implementation Services',
    category: 'REVENUE',
    description: 'Bespoke deployment architecture and systems integration fees',
    currentBalance: '28500.00',
    normalBalance: 'CREDIT',
    isActive: true,
  },
  // EXPENSES (5000 - 5999)
  {
    id: 'acc-5100',
    code: '5100',
    name: 'Salaries, Wages & Benefits Expense',
    category: 'EXPENSE',
    description: 'Gross employee compensation and health benefits',
    currentBalance: '76800.00',
    normalBalance: 'DEBIT',
    isActive: true,
  },
  {
    id: 'acc-5200',
    code: '5200',
    name: 'Cloud & Hosting Infrastructure Expense',
    category: 'EXPENSE',
    description: 'Compute instances, databases, CDNs (AWS, Neon, Cloudflare)',
    currentBalance: '24100.00',
    normalBalance: 'DEBIT',
    isActive: true,
  },
  {
    id: 'acc-5250',
    code: '5250',
    name: 'Vehicle Fuel & Fleet Logistics Expense',
    category: 'EXPENSE',
    description: 'Gasoline, diesel, fleet maintenance, delivery vehicle cards',
    currentBalance: '3850.00',
    normalBalance: 'DEBIT',
    isActive: true,
  },
  {
    id: 'acc-5300',
    code: '5300',
    name: 'Logistics & Intermodal Freight Expense',
    category: 'EXPENSE',
    description: 'Supply chain transit, warehousing, express delivery',
    currentBalance: '8900.00',
    normalBalance: 'DEBIT',
    isActive: true,
  },
  {
    id: 'acc-5350',
    code: '5350',
    name: 'Travel, Meals & Entertainment Expense',
    category: 'EXPENSE',
    description: 'Client dinners, flight tickets, rideshares, business lodging',
    currentBalance: '5120.00',
    normalBalance: 'DEBIT',
    isActive: true,
  },
  {
    id: 'acc-5400',
    code: '5400',
    name: 'Legal, Audit & Consulting Expense',
    category: 'EXPENSE',
    description: 'Outside advisory, statutory accounting audits, compliance',
    currentBalance: '6500.00',
    normalBalance: 'DEBIT',
    isActive: true,
  },
  {
    id: 'acc-5450',
    code: '5450',
    name: 'Office Supplies & Consumables Expense',
    category: 'EXPENSE',
    description: 'Stationery, printer supplies, team refreshments, petty expenses',
    currentBalance: '2150.00',
    normalBalance: 'DEBIT',
    isActive: true,
  },
  {
    id: 'acc-5500',
    code: '5500',
    name: 'Office Facilities & General Administrative',
    category: 'EXPENSE',
    description: 'Lease facilities, enterprise productivity software, utilities',
    currentBalance: '4200.00',
    normalBalance: 'DEBIT',
    isActive: true,
  },
];

export const INITIAL_JOURNAL_ENTRIES: JournalEntry[] = [
  {
    id: 'je-1001',
    entryNumber: 'JE-2026-001',
    date: '2026-09-01',
    memo: 'Fiscal Month Opening Capital Balance Verification',
    sourceModule: 'GENERAL',
    totalDebit: '350000.00',
    totalCredit: '350000.00',
    postedBy: 'Marcus Sterling',
    createdAt: '2026-09-01T08:00:00Z',
    lines: [
      {
        id: 'jel-1',
        accountId: 'acc-1010',
        accountCode: '1010',
        accountName: 'Operating Cash & Bank Account',
        description: 'Series A Capital Deposit',
        debit: '350000.00',
        credit: '0.00',
      },
      {
        id: 'jel-2',
        accountId: 'acc-3010',
        accountCode: '3010',
        accountName: 'Paid-in Capital & Equity',
        description: 'Common Stock Capitalization',
        debit: '0.00',
        credit: '350000.00',
      },
    ],
  },
  {
    id: 'je-1002',
    entryNumber: 'JE-2026-002',
    date: '2026-09-05',
    memo: 'Recognize Enterprise SaaS Annual Contract (OmniCorp)',
    sourceModule: 'INVOICING',
    totalDebit: '48000.00',
    totalCredit: '48000.00',
    postedBy: 'Devon Hayes',
    createdAt: '2026-09-05T14:30:00Z',
    lines: [
      {
        id: 'jel-3',
        accountId: 'acc-1020',
        accountCode: '1020',
        accountName: 'Accounts Receivable (A/R)',
        description: 'OmniCorp Global Contract Net-30',
        debit: '48000.00',
        credit: '0.00',
      },
      {
        id: 'jel-4',
        accountId: 'acc-4010',
        accountCode: '4010',
        accountName: 'Enterprise Subscription Revenue',
        description: '12-Month Platform Subscription',
        debit: '0.00',
        credit: '48000.00',
      },
    ],
  },
];

export const INITIAL_VENDORS: Vendor[] = [
  {
    id: 'ven-1',
    name: 'Acme Cloud Infrastructure LLC',
    taxId: 'US-94-3829104',
    contactEmail: 'billing@acmecloud.io',
    phone: '+1 (415) 555-0192',
    category: 'Cloud Services & Hosting',
    paymentTerms: 'NET_30',
    defaultExpenseAccountId: 'acc-5200',
    balanceDue: '6090.00',
  },
  {
    id: 'ven-2',
    name: 'Nexus Office Supplies & Hardware Corp',
    taxId: 'US-82-1928471',
    contactEmail: 'ar@nexusoffice.com',
    phone: '+1 (312) 555-0841',
    category: 'Hardware & Workstations',
    paymentTerms: 'NET_15',
    defaultExpenseAccountId: 'acc-1500',
    balanceDue: '5146.40',
  },
  {
    id: 'ven-3',
    name: 'Global Logistics & Freight Services',
    taxId: 'US-77-5019284',
    contactEmail: 'finance@globallogistics.net',
    phone: '+1 (206) 555-0129',
    category: 'Shipping & Freight',
    paymentTerms: 'NET_30',
    defaultExpenseAccountId: 'acc-5300',
    balanceDue: '2450.00',
  },
  {
    id: 'ven-4',
    name: 'Apex Commercial Facilities & Maintenance',
    taxId: 'US-36-8192039',
    contactEmail: 'accounts@apex-facilities.com',
    phone: '+1 (415) 555-0988',
    category: 'Building Facilities & Operations',
    paymentTerms: 'NET_30',
    defaultExpenseAccountId: 'acc-5500',
    balanceDue: '3400.00',
  },
];

export const INITIAL_PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    id: 'po-101',
    poNumber: 'PO-2026-081',
    vendorId: 'ven-1',
    vendorName: 'Acme Cloud Infrastructure LLC',
    issueDate: '2026-09-08',
    status: 'APPROVED',
    totalAmount: '6090.00',
    items: [
      {
        description: 'Dedicated Kubernetes Cluster Enterprise Tier (Monthly)',
        quantity: 1,
        unitPrice: '4200.00',
        total: '4200.00',
      },
      {
        description: 'Multi-Region High IOPS Storage (20TB)',
        quantity: 1,
        unitPrice: '1600.00',
        total: '1600.00',
      },
    ],
  },
  {
    id: 'po-102',
    poNumber: 'PO-2026-094',
    vendorId: 'ven-2',
    vendorName: 'Nexus Office Supplies & Hardware Corp',
    issueDate: '2026-09-10',
    status: 'APPROVED',
    totalAmount: '3326.40',
    items: [
      {
        description: 'Ergonomic Standing Workstations (Set of 4)',
        quantity: 4,
        unitPrice: '450.00',
        total: '1800.00',
      },
      {
        description: '4K IPS Collaboration Monitors 32"',
        quantity: 4,
        unitPrice: '320.00',
        total: '1280.00',
      },
    ],
  },
];

export const INITIAL_INVOICES: VendorInvoice[] = [
  {
    id: 'inv-1',
    invoiceNumber: 'INV-2026-9041',
    vendorId: 'ven-1',
    vendorName: 'Acme Cloud Infrastructure LLC',
    vendorTaxId: 'US-94-3829104',
    poNumber: 'PO-2026-081',
    invoiceDate: '2026-09-12',
    dueDate: '2026-10-12',
    subtotal: '5800.00',
    taxRatePercent: '5',
    taxAmount: '290.00',
    totalAmount: '6090.00',
    status: 'POSTED_TO_GL',
    rawDocumentUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=700&auto=format&fit=crop&q=80',
    aiExtracted: true,
    aiConfidence: 0.98,
    createdAt: '2026-09-12T10:15:00Z',
    journalEntryId: 'je-1003',
    lineItems: [
      {
        id: 'li-1',
        description: 'Dedicated Kubernetes Cluster Enterprise Tier (Monthly)',
        quantity: 1,
        unitPrice: '4200.00',
        total: '4200.00',
        expenseAccountId: 'acc-5200',
      },
      {
        id: 'li-2',
        description: 'Multi-Region High IOPS Storage (20TB)',
        quantity: 1,
        unitPrice: '1600.00',
        total: '1600.00',
        expenseAccountId: 'acc-5200',
      },
    ],
  },
  {
    id: 'inv-2',
    invoiceNumber: 'NX-88310',
    vendorId: 'ven-2',
    vendorName: 'Nexus Office Supplies & Hardware Corp',
    vendorTaxId: 'US-82-1928471',
    poNumber: 'PO-2026-094',
    invoiceDate: '2026-09-14',
    dueDate: '2026-09-29',
    subtotal: '3080.00',
    taxRatePercent: '8',
    taxAmount: '246.40',
    totalAmount: '3326.40',
    status: 'PENDING_AUDIT',
    rawDocumentUrl: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=700&auto=format&fit=crop&q=80',
    aiExtracted: true,
    aiConfidence: 0.95,
    createdAt: '2026-09-14T11:00:00Z',
    lineItems: [
      {
        id: 'li-3',
        description: 'Ergonomic Standing Workstations (Set of 4)',
        quantity: 4,
        unitPrice: '450.00',
        total: '1800.00',
        expenseAccountId: 'acc-1500',
      },
      {
        id: 'li-4',
        description: '4K IPS Collaboration Monitors 32"',
        quantity: 4,
        unitPrice: '320.00',
        total: '1280.00',
        expenseAccountId: 'acc-1500',
      },
    ],
  },
  {
    id: 'inv-3',
    invoiceNumber: 'GLF-10928',
    vendorId: 'ven-3',
    vendorName: 'Global Logistics & Freight Services',
    vendorTaxId: 'US-77-5019284',
    invoiceDate: '2026-07-25',
    dueDate: '2026-08-15',
    subtotal: '2333.33',
    taxRatePercent: '5',
    taxAmount: '116.67',
    totalAmount: '2450.00',
    status: 'POSTED_TO_GL',
    rawDocumentUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=700&auto=format&fit=crop&q=80',
    aiExtracted: true,
    aiConfidence: 0.94,
    createdAt: '2026-07-25T09:00:00Z',
    journalEntryId: 'je-1002',
    lineItems: [
      {
        id: 'li-5',
        description: 'Intermodal Freight & Cross-Dock Delivery',
        quantity: 1,
        unitPrice: '2333.33',
        total: '2333.33',
        expenseAccountId: 'acc-5300',
      },
    ],
  },
  {
    id: 'inv-4',
    invoiceNumber: 'NX-87940',
    vendorId: 'ven-2',
    vendorName: 'Nexus Office Supplies & Hardware Corp',
    vendorTaxId: 'US-82-1928471',
    invoiceDate: '2026-06-25',
    dueDate: '2026-07-15',
    subtotal: '1685.19',
    taxRatePercent: '8',
    taxAmount: '134.81',
    totalAmount: '1820.00',
    status: 'POSTED_TO_GL',
    rawDocumentUrl: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=700&auto=format&fit=crop&q=80',
    aiExtracted: true,
    aiConfidence: 0.92,
    createdAt: '2026-06-25T14:20:00Z',
    journalEntryId: 'je-1001',
    lineItems: [
      {
        id: 'li-6',
        description: 'Enterprise Network Switches & Cat6 Cabling',
        quantity: 1,
        unitPrice: '1685.19',
        total: '1685.19',
        expenseAccountId: 'acc-1500',
      },
    ],
  },
  {
    id: 'inv-5',
    invoiceNumber: 'APX-5510',
    vendorId: 'ven-4',
    vendorName: 'Apex Commercial Facilities & Maintenance',
    vendorTaxId: 'US-36-8192039',
    invoiceDate: '2026-04-18',
    dueDate: '2026-05-20',
    subtotal: '3148.15',
    taxRatePercent: '8',
    taxAmount: '251.85',
    totalAmount: '3400.00',
    status: 'POSTED_TO_GL',
    rawDocumentUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=700&auto=format&fit=crop&q=80',
    aiExtracted: true,
    aiConfidence: 0.96,
    createdAt: '2026-04-18T10:00:00Z',
    journalEntryId: 'je-1000',
    lineItems: [
      {
        id: 'li-7',
        description: 'Quarterly HVAC Comprehensive Overhaul & Air Quality Compliance',
        quantity: 1,
        unitPrice: '3148.15',
        total: '3148.15',
        expenseAccountId: 'acc-5500',
      },
    ],
  },
];

class GeneralLedgerEngine {
  private accounts: ChartAccount[] = [...INITIAL_CHART_OF_ACCOUNTS];
  private journalEntries: JournalEntry[] = [...INITIAL_JOURNAL_ENTRIES];
  private vendors: Vendor[] = [...INITIAL_VENDORS];
  private invoices: VendorInvoice[] = [...INITIAL_INVOICES];
  private purchaseOrders: PurchaseOrder[] = [...INITIAL_PURCHASE_ORDERS];

  getAccounts(): ChartAccount[] {
    return [...this.accounts];
  }

  getAccountById(id: string): ChartAccount | undefined {
    return this.accounts.find((a) => a.id === id);
  }

  getAccountByCode(code: string): ChartAccount | undefined {
    return this.accounts.find((a) => a.code === code);
  }

  getJournalEntries(): JournalEntry[] {
    return [...this.journalEntries];
  }

  getVendors(): Vendor[] {
    return [...this.vendors];
  }

  getInvoices(): VendorInvoice[] {
    return [...this.invoices];
  }

  getPurchaseOrders(): PurchaseOrder[] {
    return [...this.purchaseOrders];
  }

  /**
   * Posts a journal entry into the General Ledger.
   * STRICT DOUBLE-ENTRY ENFORCEMENT:
   * Total Debits MUST equal Total Credits (using Decimal.js).
   */
  postJournalEntry(entry: {
    date: string;
    memo: string;
    sourceModule: JournalEntry['sourceModule'];
    referenceId?: string;
    lines: {
      accountId: string;
      description: string;
      debit: string | number | Decimal;
      credit: string | number | Decimal;
    }[];
    postedBy?: string;
  }): JournalEntry {
    const debits = entry.lines.map((l) => l.debit);
    const credits = entry.lines.map((l) => l.credit);

    const balanceCheck = isBalanced(debits, credits);
    if (!balanceCheck.balanced) {
      throw new Error(
        `Journal entry out of balance! Total Debits: ${balanceCheck.totalDebit.toFixed(2)}, Total Credits: ${balanceCheck.totalCredit.toFixed(2)}. Difference: ${balanceCheck.difference.toFixed(2)}`
      );
    }

    const entryNumber = `JE-2026-${String(this.journalEntries.length + 1).padStart(3, '0')}`;
    const entryId = `je-${Date.now()}`;

    const resolvedLines: JournalLine[] = entry.lines.map((line, idx) => {
      const acc = this.accounts.find((a) => a.id === line.accountId);
      if (!acc) {
        throw new Error(`Account ID ${line.accountId} does not exist in Chart of Accounts.`);
      }
      return {
        id: `jel-${Date.now()}-${idx}`,
        accountId: acc.id,
        accountCode: acc.code,
        accountName: acc.name,
        description: line.description,
        debit: toDecimal(line.debit).toFixed(2),
        credit: toDecimal(line.credit).toFixed(2),
      };
    });

    // Update account balances
    for (const line of resolvedLines) {
      const acc = this.accounts.find((a) => a.id === line.accountId);
      if (acc) {
        const cur = toDecimal(acc.currentBalance);
        const deb = toDecimal(line.debit);
        const cred = toDecimal(line.credit);

        if (acc.normalBalance === 'DEBIT') {
          // Assets & Expenses increase with Debit, decrease with Credit
          acc.currentBalance = cur.plus(deb).minus(cred).toFixed(2);
        } else {
          // Liabilities, Equity, Revenue increase with Credit, decrease with Debit
          acc.currentBalance = cur.plus(cred).minus(deb).toFixed(2);
        }
      }
    }

    const newEntry: JournalEntry = {
      id: entryId,
      entryNumber,
      date: entry.date,
      memo: entry.memo,
      sourceModule: entry.sourceModule,
      referenceId: entry.referenceId,
      lines: resolvedLines,
      totalDebit: balanceCheck.totalDebit.toFixed(2),
      totalCredit: balanceCheck.totalCredit.toFixed(2),
      postedBy: entry.postedBy || coreAuthService.getCurrentUser().name,
      createdAt: new Date().toISOString(),
    };

    this.journalEntries.unshift(newEntry);

    coreAuthService.logAction(
      newEntry.postedBy,
      'POST_JOURNAL_ENTRY',
      'ACCOUNTING',
      `Posted entry ${entryNumber}: "${entry.memo}" ($${newEntry.totalDebit})`
    );

    return newEntry;
  }

  /**
   * Approves a vendor invoice and posts corresponding double-entry GL journal:
   * Debit: Expense / Asset Accounts
   * Credit: Accounts Payable (2010)
   */
  approveInvoiceAndPostGL(invoiceId: string): VendorInvoice {
    const inv = this.invoices.find((i) => i.id === invoiceId);
    if (!inv) throw new Error(`Invoice ${invoiceId} not found`);
    if (inv.status === 'POSTED_TO_GL') throw new Error('Invoice is already posted to GL');

    const apAccount = this.getAccountByCode('2010');
    if (!apAccount) throw new Error('Accounts Payable (2010) not found');

    const lines: {
      accountId: string;
      description: string;
      debit: string;
      credit: string;
    }[] = [];

    // Debit expense/asset accounts for line items
    for (const item of inv.lineItems) {
      lines.push({
        accountId: item.expenseAccountId || 'acc-5200',
        description: `${inv.vendorName}: ${item.description}`,
        debit: item.total,
        credit: '0.00',
      });
    }

    // If there is tax amount, debit expense (or tax asset)
    if (toDecimal(inv.taxAmount).greaterThan(0)) {
      lines.push({
        accountId: 'acc-5500', // General Administrative / Taxes
        description: `${inv.vendorName} Invoice Tax (${inv.taxRatePercent}%)`,
        debit: inv.taxAmount,
        credit: '0.00',
      });
    }

    // Credit Accounts Payable
    lines.push({
      accountId: apAccount.id,
      description: `Payable obligation to ${inv.vendorName} (Inv #${inv.invoiceNumber})`,
      debit: '0.00',
      credit: inv.totalAmount,
    });

    // Post to GL
    const journalEntry = this.postJournalEntry({
      date: inv.invoiceDate,
      memo: `AP Invoice Posting: ${inv.vendorName} (#${inv.invoiceNumber})`,
      sourceModule: 'ACCOUNTS_PAYABLE',
      referenceId: inv.id,
      lines,
    });

    inv.status = 'POSTED_TO_GL';
    inv.journalEntryId = journalEntry.id;

    // Update vendor balance due
    const vendor = this.vendors.find((v) => v.id === inv.vendorId);
    if (vendor) {
      vendor.balanceDue = toDecimal(vendor.balanceDue).plus(toDecimal(inv.totalAmount)).toFixed(2);
    }

    coreAuthService.logAction(
      coreAuthService.getCurrentUser().name,
      'APPROVE_INVOICE',
      'ACCOUNTING',
      `Approved invoice #${inv.invoiceNumber} from ${inv.vendorName} ($${inv.totalAmount}) and posted to GL`
    );

    return { ...inv };
  }

  /**
   * Records a payment to a vendor:
   * Debit: Accounts Payable (2010)
   * Credit: Operating Cash & Bank (1010)
   */
  recordVendorPayment(invoiceId: string): VendorInvoice {
    const inv = this.invoices.find((i) => i.id === invoiceId);
    if (!inv) throw new Error(`Invoice ${invoiceId} not found`);

    const apAccount = this.getAccountByCode('2010');
    const cashAccount = this.getAccountByCode('1010');
    if (!apAccount || !cashAccount) throw new Error('Accounts 2010 or 1010 missing');

    this.postJournalEntry({
      date: new Date().toISOString().split('T')[0],
      memo: `Payment disbursed for invoice #${inv.invoiceNumber} (${inv.vendorName})`,
      sourceModule: 'ACCOUNTS_PAYABLE',
      referenceId: inv.id,
      lines: [
        {
          accountId: apAccount.id,
          description: `Discharge A/P for ${inv.vendorName}`,
          debit: inv.totalAmount,
          credit: '0.00',
        },
        {
          accountId: cashAccount.id,
          description: `Treasury Wire Payment #${inv.invoiceNumber}`,
          debit: '0.00',
          credit: inv.totalAmount,
        },
      ],
    });

    inv.status = 'PAID';

    const vendor = this.vendors.find((v) => v.id === inv.vendorId);
    if (vendor) {
      const curDue = toDecimal(vendor.balanceDue);
      vendor.balanceDue = Decimal.max(0, curDue.minus(toDecimal(inv.totalAmount))).toFixed(2);
    }

    return { ...inv };
  }

  /**
   * Adds an invoice (from AI extraction or manual creation)
   */
  addInvoice(invoiceData: Omit<VendorInvoice, 'id' | 'createdAt' | 'status'> & { status?: VendorInvoice['status'] }): VendorInvoice {
    const newInv: VendorInvoice = {
      ...invoiceData,
      id: `inv-${Date.now()}`,
      status: invoiceData.status || 'PENDING_AUDIT',
      createdAt: new Date().toISOString(),
    };
    this.invoices.unshift(newInv);
    return newInv;
  }

  // ==================== FINANCIAL REPORTS GENERATOR ====================

  /**
   * Trial Balance Generator
   */
  generateTrialBalance(): {
    rows: { code: string; name: string; category: string; debit: string; credit: string }[];
    totalDebit: string;
    totalCredit: string;
    balanced: boolean;
  } {
    let sumDebit = new Decimal(0);
    let sumCredit = new Decimal(0);

    const rows = this.accounts.map((acc) => {
      const bal = toDecimal(acc.currentBalance);
      let debit = '0.00';
      let credit = '0.00';

      if (acc.normalBalance === 'DEBIT') {
        debit = bal.toFixed(2);
        sumDebit = sumDebit.plus(bal);
      } else {
        credit = bal.toFixed(2);
        sumCredit = sumCredit.plus(bal);
      }

      return {
        code: acc.code,
        name: acc.name,
        category: acc.category,
        debit,
        credit,
      };
    });

    return {
      rows,
      totalDebit: sumDebit.toFixed(2),
      totalCredit: sumCredit.toFixed(2),
      balanced: sumDebit.equals(sumCredit),
    };
  }

  /**
   * Profit and Loss (Income Statement) Generator
   */
  generateProfitAndLoss(): {
    revenueAccounts: { code: string; name: string; amount: string }[];
    expenseAccounts: { code: string; name: string; amount: string }[];
    totalRevenue: string;
    totalExpenses: string;
    netIncome: string;
  } {
    const revenueAccounts = this.accounts
      .filter((a) => a.category === 'REVENUE')
      .map((a) => ({ code: a.code, name: a.name, amount: a.currentBalance }));

    const expenseAccounts = this.accounts
      .filter((a) => a.category === 'EXPENSE')
      .map((a) => ({ code: a.code, name: a.name, amount: a.currentBalance }));

    const totalRevenue = revenueAccounts.reduce(
      (acc, r) => acc.plus(toDecimal(r.amount)),
      new Decimal(0)
    );
    const totalExpenses = expenseAccounts.reduce(
      (acc, e) => acc.plus(toDecimal(e.amount)),
      new Decimal(0)
    );
    const netIncome = totalRevenue.minus(totalExpenses);

    return {
      revenueAccounts,
      expenseAccounts,
      totalRevenue: totalRevenue.toFixed(2),
      totalExpenses: totalExpenses.toFixed(2),
      netIncome: netIncome.toFixed(2),
    };
  }

  /**
   * Balance Sheet Generator (Assets = Liabilities + Equity)
   */
  generateBalanceSheet(): {
    assetAccounts: { code: string; name: string; amount: string }[];
    liabilityAccounts: { code: string; name: string; amount: string }[];
    equityAccounts: { code: string; name: string; amount: string }[];
    totalAssets: string;
    totalLiabilities: string;
    totalEquity: string;
    totalLiabilitiesAndEquity: string;
    balanced: boolean;
  } {
    const pnl = this.generateProfitAndLoss();
    const currentNetIncome = toDecimal(pnl.netIncome);

    const assetAccounts = this.accounts
      .filter((a) => a.category === 'ASSET')
      .map((a) => ({ code: a.code, name: a.name, amount: a.currentBalance }));

    const liabilityAccounts = this.accounts
      .filter((a) => a.category === 'LIABILITY')
      .map((a) => ({ code: a.code, name: a.name, amount: a.currentBalance }));

    const equityAccounts = this.accounts
      .filter((a) => a.category === 'EQUITY')
      .map((a) => ({ code: a.code, name: a.name, amount: a.currentBalance }));

    const totalAssets = assetAccounts.reduce(
      (acc, a) => acc.plus(toDecimal(a.amount)),
      new Decimal(0)
    );
    const totalLiabilities = liabilityAccounts.reduce(
      (acc, l) => acc.plus(toDecimal(l.amount)),
      new Decimal(0)
    );
    const equitySubtotal = equityAccounts.reduce(
      (acc, e) => acc.plus(toDecimal(e.amount)),
      new Decimal(0)
    );

    const totalEquity = equitySubtotal.plus(currentNetIncome);
    const totalLiabilitiesAndEquity = totalLiabilities.plus(totalEquity);

    return {
      assetAccounts,
      liabilityAccounts,
      equityAccounts: [
        ...equityAccounts,
        { code: 'NET-INC', name: 'Current Period Net Earnings', amount: currentNetIncome.toFixed(2) },
      ],
      totalAssets: totalAssets.toFixed(2),
      totalLiabilities: totalLiabilities.toFixed(2),
      totalEquity: totalEquity.toFixed(2),
      totalLiabilitiesAndEquity: totalLiabilitiesAndEquity.toFixed(2),
      balanced: totalAssets.equals(totalLiabilitiesAndEquity),
    };
  }

  /**
   * Generates a 30/60/90-Day Accounts Payable Aging Report
   * Categorizes outstanding (unpaid) vendor invoices:
   * - Current (0 - 30 days)
   * - 31 - 60 days
   * - 61 - 90 days
   * - > 90 days (Overdue)
   */
  generateAPAgingReport(): {
    overall: APAgingBucket;
    vendorBreakdown: VendorAgingSummary[];
  } {
    const today = new Date('2026-09-21').getTime();
    const unpaidInvoices = this.invoices.filter((i) => i.status !== 'PAID');

    let curTotal = new Decimal(0);
    let d30Total = new Decimal(0);
    let d60Total = new Decimal(0);
    let d90Total = new Decimal(0);

    const vendorMap = new Map<
      string,
      {
        vendorId: string;
        vendorName: string;
        current: Decimal;
        days31To60: Decimal;
        days61To90: Decimal;
        over90Days: Decimal;
        total: Decimal;
        count: number;
      }
    >();

    for (const inv of unpaidInvoices) {
      const invDate = new Date(inv.dueDate || inv.invoiceDate).getTime();
      const diffDays = Math.max(0, Math.floor((today - invDate) / (1000 * 60 * 60 * 24)));
      const amount = toDecimal(inv.totalAmount);

      if (!vendorMap.has(inv.vendorId)) {
        vendorMap.set(inv.vendorId, {
          vendorId: inv.vendorId,
          vendorName: inv.vendorName,
          current: new Decimal(0),
          days31To60: new Decimal(0),
          days61To90: new Decimal(0),
          over90Days: new Decimal(0),
          total: new Decimal(0),
          count: 0,
        });
      }

      const vEntry = vendorMap.get(inv.vendorId)!;
      vEntry.total = vEntry.total.plus(amount);
      vEntry.count += 1;

      if (diffDays <= 30) {
        curTotal = curTotal.plus(amount);
        vEntry.current = vEntry.current.plus(amount);
      } else if (diffDays <= 60) {
        d30Total = d30Total.plus(amount);
        vEntry.days31To60 = vEntry.days31To60.plus(amount);
      } else if (diffDays <= 90) {
        d60Total = d60Total.plus(amount);
        vEntry.days61To90 = vEntry.days61To90.plus(amount);
      } else {
        d90Total = d90Total.plus(amount);
        vEntry.over90Days = vEntry.over90Days.plus(amount);
      }
    }

    const overallTotal = curTotal.plus(d30Total).plus(d60Total).plus(d90Total);

    const vendorBreakdown: VendorAgingSummary[] = Array.from(vendorMap.values()).map((v) => ({
      vendorId: v.vendorId,
      vendorName: v.vendorName,
      current: v.current.toFixed(2),
      days31To60: v.days31To60.toFixed(2),
      days61To90: v.days61To90.toFixed(2),
      over90Days: v.over90Days.toFixed(2),
      total: v.total.toFixed(2),
      invoiceCount: v.count,
    }));

    return {
      overall: {
        current: curTotal.toFixed(2),
        days31To60: d30Total.toFixed(2),
        days61To90: d60Total.toFixed(2),
        over90Days: d90Total.toFixed(2),
        total: overallTotal.toFixed(2),
        invoiceCount: unpaidInvoices.length,
      },
      vendorBreakdown,
    };
  }
}

export const glEngine = new GeneralLedgerEngine();
