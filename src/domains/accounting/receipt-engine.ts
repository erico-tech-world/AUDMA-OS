import {
  ExpenseReceipt,
  ExpenseClaimStatus,
  ReceiptExpenseCategory,
} from '../../types';
import { glEngine } from './gl-engine';
import { coreAuthService } from '../core/rbac';
import { Decimal, toDecimal } from '../../lib/math';

export interface ExpenseInputSettings {
  defaultCategory: ReceiptExpenseCategory;
  requireTaxId: boolean;
  requireMileageTracking: boolean;
  requireProjectCostCenter: boolean;
  maxAutoApprovalThreshold: string;
  defaultPaymentMethod: 'CORPORATE_CARD' | 'EMPLOYEE_REIMBURSEMENT' | 'PETTY_CASH';
  customField1Label?: string;
  customField1Active?: boolean;
}

export const INITIAL_RECEIPTS: ExpenseReceipt[] = [
  {
    id: 'rcp-1',
    claimNumber: 'EXP-2026-001',
    employeeId: 'usr-5',
    employeeName: 'Kavita Patel',
    merchantName: 'Shell Express Fuel Station #4812',
    transactionDate: '2026-09-18',
    category: 'FUEL_LOGISTICS',
    expenseAccountId: 'acc-5250',
    accountCode: '5250',
    accountName: 'Vehicle Fuel & Fleet Logistics Expense',
    subtotal: '84.50',
    taxAmount: '6.76',
    totalAmount: '91.26',
    currency: 'USD',
    purposeMemo: 'Refueling Enterprise Delivery Van #3 during customer dispatch route',
    status: 'APPROVED',
    rawReceiptUrl: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=700&auto=format&fit=crop&q=80',
    aiExtracted: true,
    aiConfidence: 0.98,
    aiSuggestedAccountCode: '5250',
    approvedBy: 'Marcus Sterling (FINANCIAL_CONTROLLER)',
    approvedAt: '2026-09-19T10:30:00Z',
    journalEntryId: 'je-1004',
    createdAt: '2026-09-18T16:45:00Z',
  },
  {
    id: 'rcp-2',
    claimNumber: 'EXP-2026-002',
    employeeId: 'usr-4',
    employeeName: 'Devon Hayes',
    merchantName: 'Staples Business Solutions Store #102',
    transactionDate: '2026-09-19',
    category: 'OFFICE_SUPPLIES',
    expenseAccountId: 'acc-5450',
    accountCode: '5450',
    accountName: 'Office Supplies & Consumables Expense',
    subtotal: '138.20',
    taxAmount: '11.06',
    totalAmount: '149.26',
    currency: 'USD',
    purposeMemo: 'Recycled printer paper cartridges and archival binders for Q3 audit filings',
    status: 'PENDING_AUDIT',
    rawReceiptUrl: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=700&auto=format&fit=crop&q=80',
    aiExtracted: true,
    aiConfidence: 0.96,
    aiSuggestedAccountCode: '5450',
    createdAt: '2026-09-19T14:10:00Z',
  },
  {
    id: 'rcp-3',
    claimNumber: 'EXP-2026-003',
    employeeId: 'usr-3',
    employeeName: 'Amara Chen',
    merchantName: 'The Capital Grille & Bistro',
    transactionDate: '2026-09-20',
    category: 'MEALS_SUBSISTENCE',
    expenseAccountId: 'acc-5350',
    accountCode: '5350',
    accountName: 'Travel, Meals & Entertainment Expense',
    subtotal: '215.00',
    taxAmount: '19.35',
    totalAmount: '234.35',
    currency: 'USD',
    purposeMemo: 'Working dinner with Tier-1 prospective enterprise engineering leads',
    status: 'PENDING_AUDIT',
    rawReceiptUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=700&auto=format&fit=crop&q=80',
    aiExtracted: true,
    aiConfidence: 0.94,
    aiSuggestedAccountCode: '5350',
    createdAt: '2026-09-20T21:15:00Z',
  },
  {
    id: 'rcp-4',
    claimNumber: 'EXP-2026-004',
    employeeId: 'usr-5',
    employeeName: 'Kavita Patel',
    merchantName: 'Uber Technologies Rideshare Inc.',
    transactionDate: '2026-09-21',
    category: 'TRAVEL_ENTERTAINMENT',
    expenseAccountId: 'acc-5350',
    accountCode: '5350',
    accountName: 'Travel, Meals & Entertainment Expense',
    subtotal: '42.80',
    taxAmount: '3.42',
    totalAmount: '46.22',
    currency: 'USD',
    purposeMemo: 'Transit from headquarters to municipal courthouse for notarization',
    status: 'PENDING_AUDIT',
    rawReceiptUrl: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=700&auto=format&fit=crop&q=80',
    aiExtracted: true,
    aiConfidence: 0.99,
    aiSuggestedAccountCode: '5350',
    createdAt: '2026-09-21T09:20:00Z',
  },
];

export class ReceiptExpenseEngine {
  private receipts: ExpenseReceipt[] = [...INITIAL_RECEIPTS];
  private claimCounter: number = 5;
  private settings: ExpenseInputSettings = {
    defaultCategory: 'OFFICE_SUPPLIES',
    requireTaxId: false,
    requireMileageTracking: false,
    requireProjectCostCenter: true,
    maxAutoApprovalThreshold: '50.00',
    defaultPaymentMethod: 'EMPLOYEE_REIMBURSEMENT',
    customField1Label: 'Cost Center / Project Code',
    customField1Active: true,
  };

  getReceipts(): ExpenseReceipt[] {
    return [...this.receipts].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  getReceiptById(id: string): ExpenseReceipt | undefined {
    return this.receipts.find((r) => r.id === id);
  }

  getSettings(): ExpenseInputSettings {
    return { ...this.settings };
  }

  updateSettings(newSettings: Partial<ExpenseInputSettings>): ExpenseInputSettings {
    this.settings = { ...this.settings, ...newSettings };
    return { ...this.settings };
  }

  createReceipt(
    data: Omit<ExpenseReceipt, 'id' | 'claimNumber' | 'createdAt' | 'status'> & {
      status?: ExpenseClaimStatus;
    }
  ): ExpenseReceipt {
    const claimNumber = `EXP-2026-${String(this.claimCounter++).padStart(3, '0')}`;
    const newReceipt: ExpenseReceipt = {
      ...data,
      id: `rcp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      claimNumber,
      status: data.status || 'PENDING_AUDIT',
      createdAt: new Date().toISOString(),
    };

    this.receipts.unshift(newReceipt);

    coreAuthService.logAction(
      `${data.employeeName} (STAFF)`,
      'EXPENSE_RECEIPT_SUBMITTED',
      'ACCOUNTING',
      `Submitted expense claim ${claimNumber} for ${data.merchantName} ($${data.totalAmount})`
    );

    return newReceipt;
  }

  approveReceiptAndPostGL(
    receiptId: string,
    approvedBy: string
  ): { success: boolean; receipt?: ExpenseReceipt; error?: string } {
    const receipt = this.receipts.find((r) => r.id === receiptId);
    if (!receipt) {
      return { success: false, error: 'Receipt not found' };
    }

    if (receipt.status === 'APPROVED' || receipt.status === 'PAID_REIMBURSED') {
      return { success: false, error: 'Receipt has already been approved' };
    }

    // Lookup GL account
    const accounts = glEngine.getAccounts();
    const expenseAcc =
      accounts.find((a) => a.code === receipt.accountCode) ||
      accounts.find((a) => a.code === '5500') ||
      accounts[accounts.length - 1];

    const cashAcc = accounts.find((a) => a.code === '1010') || accounts[0];

    try {
      // Post strict double-entry journal entry to GL:
      // Debit: Operating Expense Account
      // Credit: Operating Cash & Bank (#1010)
      const je = glEngine.postJournalEntry({
        date: receipt.transactionDate || new Date().toISOString().split('T')[0],
        memo: `Expense Reimbursement [${receipt.claimNumber}]: ${receipt.merchantName} - ${receipt.purposeMemo || 'Operational receipt'}`,
        sourceModule: 'EXPENSE_RECEIPT',
        referenceId: receipt.id,
        lines: [
          {
            accountId: expenseAcc.id,
            description: `${expenseAcc.name} - ${receipt.merchantName}`,
            debit: receipt.totalAmount,
            credit: '0.00',
          },
          {
            accountId: cashAcc.id,
            description: `Cash Reimbursement Disbursement - ${receipt.employeeName}`,
            debit: '0.00',
            credit: receipt.totalAmount,
          },
        ],
      });

      receipt.status = 'APPROVED';
      receipt.approvedBy = approvedBy;
      receipt.approvedAt = new Date().toISOString();
      receipt.journalEntryId = je.id;

      coreAuthService.logAction(
        approvedBy,
        'EXPENSE_RECEIPT_APPROVED',
        'ACCOUNTING',
        `Approved claim ${receipt.claimNumber} ($${receipt.totalAmount}) and posted GL journal ${je.entryNumber}`
      );

      return { success: true, receipt };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to post GL entry';
      return { success: false, error: msg };
    }
  }

  rejectReceipt(
    receiptId: string,
    reason: string,
    rejectedBy: string
  ): { success: boolean; receipt?: ExpenseReceipt; error?: string } {
    const receipt = this.receipts.find((r) => r.id === receiptId);
    if (!receipt) {
      return { success: false, error: 'Receipt not found' };
    }

    receipt.status = 'REJECTED';
    receipt.rejectionReason = reason;

    coreAuthService.logAction(
      rejectedBy,
      'EXPENSE_RECEIPT_REJECTED',
      'ACCOUNTING',
      `Rejected claim ${receipt.claimNumber} (${receipt.merchantName}): "${reason}"`
    );

    return { success: true, receipt };
  }

  deleteReceipt(receiptId: string): boolean {
    const idx = this.receipts.findIndex((r) => r.id === receiptId);
    if (idx !== -1) {
      this.receipts.splice(idx, 1);
      return true;
    }
    return false;
  }

  getSummaryMetrics(): {
    totalSubmittedThisMonth: string;
    pendingAmount: string;
    pendingCount: number;
    approvedAmount: string;
    aiConfidenceAvg: number;
    topCategory: string;
  } {
    let totalAll = new Decimal(0);
    let pending = new Decimal(0);
    let approved = new Decimal(0);
    let pendingCount = 0;
    let confidenceSum = 0;
    let confidenceCount = 0;
    const catMap = new Map<string, number>();

    for (const r of this.receipts) {
      const amt = toDecimal(r.totalAmount);
      totalAll = totalAll.plus(amt);

      if (
        r.status === 'PENDING_APPROVAL' ||
        r.status === 'PENDING_AUDIT' ||
        (r.status as string) === 'PENDING' ||
        r.status === 'DRAFT'
      ) {
        pending = pending.plus(amt);
        pendingCount += 1;
      } else if (r.status === 'APPROVED' || r.status === 'PAID_REIMBURSED') {
        approved = approved.plus(amt);
      }

      if (r.aiConfidence) {
        confidenceSum += r.aiConfidence;
        confidenceCount += 1;
      }

      const count = catMap.get(r.category) || 0;
      catMap.set(r.category, count + 1);
    }

    let topCategory = 'FUEL_LOGISTICS';
    let maxCat = 0;
    catMap.forEach((cnt, cat) => {
      if (cnt > maxCat) {
        maxCat = cnt;
        topCategory = cat;
      }
    });

    const aiConfidenceAvg =
      confidenceCount > 0 ? Math.round((confidenceSum / confidenceCount) * 100) : 98;

    return {
      totalSubmittedThisMonth: totalAll.toFixed(2),
      pendingAmount: pending.toFixed(2),
      pendingCount,
      approvedAmount: approved.toFixed(2),
      aiConfidenceAvg,
      topCategory,
    };
  }
}

export const receiptExpenseEngine = new ReceiptExpenseEngine();
