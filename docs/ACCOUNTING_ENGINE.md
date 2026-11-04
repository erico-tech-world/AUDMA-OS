# AUDMA OS - Double-Entry Accounting Engine Specification

## 1. Theoretical Foundations of Double-Entry Bookkeeping

AUDMA OS implements a mathematically rigorous double-entry accounting engine following Generally Accepted Accounting Principles (GAAP) and International Financial Reporting Standards (IFRS).

### The Fundamental Accounting Equation
$$\text{Assets} = \text{Liabilities} + \text{Equity} + (\text{Revenues} - \text{Expenses})$$

Every recorded transaction is represented by an immutable **Journal Entry** containing at least two lines. For every journal entry $J$:
$$\sum_{i=1}^{n} \text{Debit}_i = \sum_{i=1}^{n} \text{Credit}_i$$

### Normal Balance Conventions

| Account Category | Code Range | Normal Balance | To Increase | To Decrease |
| :--- | :--- | :--- | :--- | :--- |
| **Asset** | 1000–1999 | Debit | Debit | Credit |
| **Liability** | 2000–2999 | Credit | Credit | Debit |
| **Equity** | 3000–3999 | Credit | Credit | Debit |
| **Revenue** | 4000–4999 | Credit | Credit | Debit |
| **COGS** | 5000–5099 | Debit | Debit | Credit |
| **Expense** | 5100–5999 | Debit | Debit | Credit |

---

## 2. Floating-Point Prevention with Decimal.js

Standard JavaScript numeric types adhere to the IEEE 754 standard for double-precision floating-point numbers. In financial computations, this introduces rounding artifacts:
```javascript
0.1 + 0.2 === 0.30000000000000004 // true in standard JS
```
Such errors corrupt financial ledgers and fail balance audits. AUDMA OS mitigates this vulnerability by isolating all monetary operations inside `src/lib/math.ts`:

```typescript
import Decimal from 'decimal.js';

// Global precision lock for enterprise accounting standards
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export function toDecimal(value: number | string | Decimal | null | undefined): Decimal {
  if (value === null || value === undefined || value === '') return new Decimal(0);
  if (value instanceof Decimal) return value;
  try {
    return new Decimal(value);
  } catch {
    return new Decimal(0);
  }
}
```

### Invariance Validation Helper
Before any journal entry is saved, `isBalanced` evaluates debit and credit totals:
```typescript
export function isBalanced(
  debits: (number | string | Decimal)[],
  credits: (number | string | Decimal)[]
): { balanced: boolean; totalDebit: Decimal; totalCredit: Decimal; difference: Decimal } {
  const totalDebit = debits.reduce<Decimal>((acc, val) => acc.plus(toDecimal(val)), new Decimal(0));
  const totalCredit = credits.reduce<Decimal>((acc, val) => acc.plus(toDecimal(val)), new Decimal(0));
  const difference = totalDebit.minus(totalCredit).abs();
  return {
    balanced: totalDebit.equals(totalCredit),
    totalDebit,
    totalCredit,
    difference,
  };
}
```

If `balanced` is false, `glEngine.postJournalEntry` throws an exception, preventing uncommitted ledger drift.

---

## 3. Chart of Accounts (COA) Structure

AUDMA OS ships with an enterprise Chart of Accounts:

```
├── 1000 ASSETS
│   ├── 1010 Operating Cash & Checking
│   ├── 1020 Payroll Clearing Account
│   ├── 1100 Accounts Receivable (A/R)
│   ├── 1110 Allowance for Doubtful Accounts (Contra)
│   ├── 1200 Prepaid Expenses
│   └── 1500 Computer Equipment & IT Hardware
│
├── 2000 LIABILITIES
│   ├── 2000 Accounts Payable (A/P)
│   ├── 2010 Accrued Operating Expenses
│   ├── 2100 Payroll Withholding Tax Payable
│   ├── 2110 Pension & Retirement Match Payable
│   └── 2200 Sales Tax Payable
│
├── 3000 EQUITY
│   ├── 3000 Common Stock & Contributed Capital
│   └── 3100 Retained Earnings
│
├── 4000 REVENUE
│   ├── 4010 SaaS Software Subscription Revenue
│   └── 4020 Implementation & Professional Services
│
└── 5000 EXPENSES & COGS
    ├── 5100 Salaries & Employee Compensation Expense
    ├── 5200 Cloud Hosting & Infrastructure Expense
    ├── 5250 Vehicle Fuel & Fleet Logistics Expense
    ├── 5300 Freight & Logistics Expense
    ├── 5350 Travel, Meals & Entertainment Expense
    ├── 5400 Professional & Legal Services Expense
    ├── 5450 Office Supplies & Consumables Expense
    └── 5500 Office Facilities & General Admin
```

---

## 4. Financial Statements Generation

### 4.1 Trial Balance
The Trial Balance calculates the sum of all debit balances and credit balances across every open account:
1. For Asset & Expense accounts: Balance = $\sum \text{Debits} - \sum \text{Credits}$
2. For Liability, Equity & Revenue accounts: Balance = $\sum \text{Credits} - \sum \text{Debits}$
3. Verifies that $\sum \text{All Debit Balances} = \sum \text{All Credit Balances}$.

### 4.2 Balance Sheet
Generated dynamically as of a specified cut-off date:
- **Total Assets** = Sum of balances for all accounts with code starting with `1`.
- **Total Liabilities** = Sum of balances for all accounts with code starting with `2`.
- **Equity** = Sum of balances for accounts starting with `3` + **Current Period Net Income** (from the Income Statement).
- Proves: $\text{Assets} = \text{Liabilities} + \text{Equity}$.

### 4.3 Income Statement (P&L)
Aggregates performance over a fiscal reporting period:
- **Total Revenue** = Sum of balances for accounts starting with `4`.
- **Total Operating Expenses** = Sum of balances for accounts starting with `5`.
- **Net Operating Income** = $\text{Total Revenue} - \text{Total Operating Expenses}$.

---

## 5. Automated Journal Templates

### 5.1 Payroll Finalization Entry
Generated automatically via `eventBus` when HRM finalizes payroll:
```
Date: 2026-10-01
Memo: Payroll Disbursement & Accruals: October 2026

Account 5100 (Salaries & Compensation)  Debit:  $45,000.00
Account 1010 (Operating Cash Bank)      Credit: $34,650.00
Account 2100 (Payroll Tax Payable)      Credit:  $6,750.00
Account 2110 (Pension Payable)          Credit:  $3,600.00
----------------------------------------------------------
Total:                                  Debit = Credit = $45,000.00
```

### 5.2 Accounts Payable (Vendor Invoice) Approval Entry
Generated when an AP invoice is verified and approved:
```
Date: 2026-10-02
Memo: Approved Invoice: Amazon Web Services (AWS-98721)

Account 5200 (Cloud Hosting Expense)    Debit:  $4,200.00
Account 2000 (Accounts Payable)         Credit: $4,200.00
```

### 5.3 Daily Operational Receipt Expense Claim Entry
Generated when a manager approves a field expense claim:
```
Date: 2026-10-03
Memo: Expense Claim: Shell Fleet Refueling (REC-8472)

Account 5250 (Vehicle Fuel Expense)     Debit:  $78.45
Account 1010 (Operating Cash Bank)      Credit: $78.45
```

---

## 6. Audit Trail & Immutability Rules

1. **No Hard Deletion**: Once posted, a journal entry cannot be deleted. If an error was recorded, an adjusting or reversing journal entry must be issued.
2. **Sequential Numbering**: All entries are stamped with unique ascending identifiers (`JE-YYYY-XXXX`).
3. **Actor Tracking**: Every entry logs the `postedBy` user identity, timestamp, and originating module (`HRM_PAYROLL`, `AP_INVOICE`, `EXPENSE_RECEIPT`, `MANUAL`).
