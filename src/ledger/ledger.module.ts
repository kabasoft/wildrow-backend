import { Module } from '@nestjs/common';
import { LedgerController } from './ledger.controller';
import { LedgerService } from './ledger.service';
import { LedgerCron } from './ledger.cron';
import { ReconciliationModule } from '../reconciliation/reconciliation.module';

@Module({
  imports: [ReconciliationModule],
  controllers: [LedgerController],
  providers: [LedgerService, LedgerCron],
  exports: [LedgerService],
})
export class LedgerModule {}
