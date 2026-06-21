import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { LedgerService } from './ledger.service';
import { ReconciliationService } from '../reconciliation/reconciliation.service';

@Injectable()
export class LedgerCron {
  private readonly logger = new Logger(LedgerCron.name);

  constructor(
    private readonly ledger: LedgerService,
    private readonly reconciliation: ReconciliationService,
  ) {}

  /**
   * 23:59:59 Africa/Lusaka (CAT, UTC+2 — no DST) per Appendix D §2B
   * "Execution Loop". Cron expression is in UTC on the server, so CAT is
   * expressed as UTC+2: 21:59:59 UTC.
   */
  @Cron('59 59 21 * * *', { timeZone: 'UTC' })
  async runNightlyAccrual() {
    this.logger.log('Starting nightly amortized yield accrual run (23:59:59 CAT)');
    const result = await this.ledger.accrueDailyYieldForAllWallets();
    this.logger.log(`Nightly accrual complete: ${JSON.stringify(result)}`);
  }

  /** 17:00 CAT daily settlement sweep handoff to the custodian (Appendix C §2A step 7). */
  @Cron('0 0 15 * * *', { timeZone: 'UTC' })
  async runEodReconciliationExport() {
    this.logger.log('Generating EOD reconciliation file for Custodian Bank sweep (17:00 CAT)');
    await this.reconciliation.generateAndTransmitDailyBatch();
  }
}
