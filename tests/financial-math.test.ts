import assert from 'node:assert/strict';
import test from 'node:test';
import { glEngine } from '../src/domains/accounting/gl-engine';
import { hrmEngine } from '../src/domains/hrm/hrm-engine';
import { receiptExpenseEngine } from '../src/domains/accounting/receipt-engine';
import { getServerAIProvider, validateAIRequest } from '../src/lib/ai-request';
import { calcPercentage, isBalanced, toDecimal } from '../src/lib/math';

test('toDecimal preserves exact decimal values', () => {
  assert.equal(toDecimal('0.1').plus('0.2').toFixed(2), '0.30');
  assert.equal(toDecimal(null).toFixed(2), '0.00');
  assert.equal(toDecimal(undefined).toFixed(2), '0.00');
  assert.equal(toDecimal('').toFixed(2), '0.00');
});

test('toDecimal rejects malformed and non-finite financial values', () => {
  for (const value of ['not-a-number', ' ', 'NaN', 'Infinity']) {
    assert.throws(() => toDecimal(value), TypeError);
  }

  assert.throws(() => toDecimal(Number.NaN), TypeError);
  assert.throws(() => toDecimal(Number.POSITIVE_INFINITY), TypeError);
});

test('isBalanced compares exact debit and credit totals', () => {
  const balanced = isBalanced(['0.10', '0.20'], ['0.30']);
  assert.equal(balanced.balanced, true);
  assert.equal(balanced.totalDebit.toFixed(2), '0.30');

  const unbalanced = isBalanced(['12.00'], ['11.99']);
  assert.equal(unbalanced.balanced, false);
  assert.equal(unbalanced.difference.toFixed(2), '0.01');
});

test('calcPercentage rounds to currency precision using half-up rounding', () => {
  assert.equal(calcPercentage('10.05', '10').toFixed(2), '1.01');
});

test('journal posting rejects empty, zero-value, negative, and mixed-sided entries', () => {
  const existingCount = glEngine.getJournalEntries().length;
  const baseEntry = {
    date: '2026-10-01',
    memo: 'Validation test',
    sourceModule: 'GENERAL' as const,
  };

  assert.throws(() => glEngine.postJournalEntry({ ...baseEntry, lines: [] }), /at least two lines/i);
  assert.throws(
    () => glEngine.postJournalEntry({ ...baseEntry, lines: [
      { accountId: 'acc-1010', description: 'No amount', debit: '0.00', credit: '0.00' },
      { accountId: 'acc-3010', description: 'No amount', debit: '0.00', credit: '0.00' },
    ] }),
    /exactly one positive debit or credit/i
  );
  assert.throws(
    () => glEngine.postJournalEntry({ ...baseEntry, lines: [
      { accountId: 'acc-1010', description: 'Negative', debit: '-1.00', credit: '0.00' },
      { accountId: 'acc-3010', description: 'Negative', debit: '0.00', credit: '-1.00' },
    ] }),
    /non-negative/i
  );
  assert.throws(
    () => glEngine.postJournalEntry({ ...baseEntry, lines: [
      { accountId: 'acc-1010', description: 'Both sides', debit: '1.00', credit: '1.00' },
      { accountId: 'acc-3010', description: 'Both sides', debit: '1.00', credit: '1.00' },
    ] }),
    /exactly one positive debit or credit/i
  );
  assert.throws(
    () => glEngine.postJournalEntry({ ...baseEntry, lines: [
      { accountId: 'acc-1010', description: 'Sub-cent', debit: '1.001', credit: '0.00' },
      { accountId: 'acc-3010', description: 'Sub-cent', debit: '0.00', credit: '1.001' },
    ] }),
    /more than two decimal places/i
  );
  assert.throws(
    () => glEngine.postJournalEntry({ ...baseEntry, date: '2026-02-30', lines: [
      { accountId: 'acc-1010', description: 'Invalid date', debit: '1.00', credit: '0.00' },
      { accountId: 'acc-3010', description: 'Invalid date', debit: '0.00', credit: '1.00' },
    ] }),
    /valid ISO calendar date/i
  );
  assert.equal(glEngine.getJournalEntries().length, existingCount);
});

test('journal posting rejects unknown accounts without mutating the ledger', () => {
  const existingCount = glEngine.getJournalEntries().length;
  assert.throws(
    () => glEngine.postJournalEntry({
      date: '2026-10-01',
      memo: 'Unknown account test',
      sourceModule: 'GENERAL',
      lines: [
        { accountId: 'missing-account', description: 'Debit', debit: '10.00', credit: '0.00' },
        { accountId: 'acc-3010', description: 'Credit', debit: '0.00', credit: '10.00' },
      ],
    }),
    /does not exist/i
  );
  assert.equal(glEngine.getJournalEntries().length, existingCount);
});

test('vendor payments require a posted invoice and cannot be recorded twice', () => {
  const pendingInvoice = glEngine.getInvoices().find((invoice) => invoice.id === 'inv-2');
  assert.ok(pendingInvoice);
  const initialEntryCount = glEngine.getJournalEntries().length;
  assert.throws(
    () => glEngine.recordVendorPayment(pendingInvoice.id),
    /must be posted to GL before payment/i
  );
  assert.equal(glEngine.getJournalEntries().length, initialEntryCount);

  const postedInvoice = glEngine.approveInvoiceAndPostGL(pendingInvoice.id);
  const entryCountAfterApproval = glEngine.getJournalEntries().length;
  assert.equal(postedInvoice.status, 'POSTED_TO_GL');
  assert.throws(() => glEngine.approveInvoiceAndPostGL(pendingInvoice.id), /must be pending audit/i);
  assert.equal(glEngine.getJournalEntries().length, entryCountAfterApproval);

  glEngine.recordVendorPayment(postedInvoice.id);
  const entryCountAfterPayment = glEngine.getJournalEntries().length;
  assert.equal(glEngine.getInvoices().find((invoice) => invoice.id === postedInvoice.id)?.status, 'PAID');
  assert.throws(() => glEngine.approveInvoiceAndPostGL(pendingInvoice.id), /must be pending audit/i);
  assert.throws(() => glEngine.recordVendorPayment(postedInvoice.id), /already been paid/i);
  assert.equal(glEngine.getJournalEntries().length, entryCountAfterPayment);
});

test('receipt approval and rejection only accept pending claims', () => {
  const pendingReceipt = receiptExpenseEngine.getReceiptById('rcp-2');
  assert.ok(pendingReceipt);
  const rejection = receiptExpenseEngine.rejectReceipt(pendingReceipt.id, 'Missing business purpose', 'Reviewer');
  assert.equal(rejection.success, true);
  assert.equal(rejection.receipt?.status, 'REJECTED');

  const entryCount = glEngine.getJournalEntries().length;
  const approval = receiptExpenseEngine.approveReceiptAndPostGL(pendingReceipt.id, 'Reviewer');
  assert.equal(approval.success, false);
  assert.match(approval.error || '', /pending approval/i);
  assert.equal(glEngine.getJournalEntries().length, entryCount);

  const repeatedRejection = receiptExpenseEngine.rejectReceipt(pendingReceipt.id, 'Second rejection', 'Reviewer');
  assert.equal(repeatedRejection.success, false);
  assert.equal(receiptExpenseEngine.getReceiptById(pendingReceipt.id)?.status, 'REJECTED');
});

test('receipt deletion cannot remove submitted or posted claim records', () => {
  assert.equal(receiptExpenseEngine.deleteReceipt('rcp-1'), false);
  assert.equal(receiptExpenseEngine.getReceiptById('rcp-1')?.status, 'APPROVED');
  assert.equal(receiptExpenseEngine.deleteReceipt('rcp-3'), false);
  assert.equal(receiptExpenseEngine.getReceiptById('rcp-3')?.status, 'PENDING_APPROVAL');
});

test('attendance rejects a second open clock-in for the same employee and date', () => {
  const employeeId = 'emp-106';
  const today = new Date().toISOString().slice(0, 10);
  const beforeCount = hrmEngine.getAttendance().length;

  hrmEngine.recordClockIn(employeeId);
  const afterFirstClockIn = hrmEngine.getAttendance().length;
  assert.equal(afterFirstClockIn, beforeCount + 1);
  assert.throws(() => hrmEngine.recordClockIn(employeeId), /already has an open clock-in/i);
  assert.equal(hrmEngine.getAttendance().filter((record) => record.employeeId === employeeId && record.date === today).length, 1);
});

test('leave requests can only transition from pending once', () => {
  const requestId = 'lev-1';
  const approved = hrmEngine.updateLeaveStatus(requestId, 'APPROVED');
  assert.equal(approved.status, 'APPROVED');
  assert.throws(() => hrmEngine.updateLeaveStatus(requestId, 'REJECTED'), /must be pending/i);
  assert.equal(hrmEngine.getLeaveRequests().find((request) => request.id === requestId)?.status, 'APPROVED');
});

test('AI request validation requires payloads and rejects unsupported providers', () => {
  assert.match(validateAIRequest({}, 'extract') || '', /required/i);
  assert.match(validateAIRequest({ content: 'receipt', provider: 'claude' }, 'extract') || '', /unsupported/i);
  assert.match(validateAIRequest({ content: 42 }, 'extract') || '', /content must be a string/i);
  assert.match(validateAIRequest({}, 'generate') || '', /required/i);
  assert.equal(validateAIRequest({ content: 'invoice text', provider: 'openai' }, 'extract'), null);
});

test('AI request validation bounds payload size and provider selection', () => {
  const oversizedContent = 'x'.repeat(8 * 1024 * 1024 + 1);
  assert.match(validateAIRequest({ content: oversizedContent }, 'extract') || '', /maximum allowed size/i);
  assert.equal(getServerAIProvider(undefined), 'ollama');
  assert.equal(getServerAIProvider('ollama'), 'ollama');
  assert.throws(() => getServerAIProvider('local_ocr'), /unsupported/i);
});