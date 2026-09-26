import { ProviderFactory } from '../../providers/factory';
import { glEngine } from '../accounting/gl-engine';
import { coreAuthService } from '../core/rbac';

export interface PayrollFinalizedPayload {
  periodId: string;
  periodName: string;
  totalGross: string;
  totalNet: string;
  totalTax: string;
  totalPension: string;
  finalizedBy: string;
  timestamp: string;
}

class DecoupledEventBus {
  private initialized = false;

  public async publish<T>(eventName: string, payload: T): Promise<string> {
    const queue = ProviderFactory.getInstance().getQueue();
    return queue.publish(eventName, payload);
  }

  public initDomainListeners() {
    if (this.initialized) return;
    this.initialized = true;

    const queue = ProviderFactory.getInstance().getQueue();

    // Cross-domain workflow: HRM Payroll Finalization -> Accounting General Ledger Posting
    queue.subscribe<PayrollFinalizedPayload>('hrm.payroll.finalized', async (payload) => {
      try {
        const salariesExpenseAcc = glEngine.getAccountByCode('5100');
        const bankCashAcc = glEngine.getAccountByCode('1010');
        const taxPayableAcc = glEngine.getAccountByCode('2100');
        const pensionPayableAcc = glEngine.getAccountByCode('2110');

        if (!salariesExpenseAcc || !bankCashAcc || !taxPayableAcc || !pensionPayableAcc) {
          console.error('Missing GL accounts for payroll journal posting');
          return;
        }

        const journalEntry = glEngine.postJournalEntry({
          date: payload.timestamp.split('T')[0],
          memo: `Payroll Disbursement & Accruals: ${payload.periodName}`,
          sourceModule: 'HRM_PAYROLL',
          referenceId: payload.periodId,
          lines: [
            {
              accountId: salariesExpenseAcc.id,
              description: `Gross Salaries & Employee Compensation (${payload.periodName})`,
              debit: payload.totalGross,
              credit: '0.00',
            },
            {
              accountId: bankCashAcc.id,
              description: `Net Pay Direct Deposit Treasury Disbursement`,
              debit: '0.00',
              credit: payload.totalNet,
            },
            {
              accountId: taxPayableAcc.id,
              description: `Statutory Payroll Withholding Tax Liability`,
              debit: '0.00',
              credit: payload.totalTax,
            },
            {
              accountId: pensionPayableAcc.id,
              description: `Retirement & Pension Match Liability`,
              debit: '0.00',
              credit: payload.totalPension,
            },
          ],
          postedBy: `System Event Bus (via ${payload.finalizedBy})`,
        });

        coreAuthService.logAction(
          'AUDMA Event Worker',
          'ASYNC_GL_POSTING',
          'ACCOUNTING',
          `Decoupled event 'hrm.payroll.finalized' processed -> GL Entry ${journalEntry.entryNumber} posted ($${payload.totalGross})`
        );
      } catch (error) {
        console.error('Failed to post payroll journal entry:', error);
      }
    });
  }
}

export const eventBus = new DecoupledEventBus();
// Initialize listeners
eventBus.initDomainListeners();
