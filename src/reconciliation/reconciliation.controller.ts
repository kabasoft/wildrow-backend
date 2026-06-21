import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ReconciliationService } from './reconciliation.service';

@ApiTags('reconciliation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard) // in production, restrict to an internal/ops role guard, not any authenticated investor
@Controller('v1/ops/reconciliation')
export class ReconciliationController {
  constructor(private readonly reconciliation: ReconciliationService) {}

  @Post('run-now')
  @ApiOperation({ summary: '[ops] Manually trigger the EOD custodian reconciliation export' })
  runNow() {
    return this.reconciliation.generateAndTransmitDailyBatch();
  }
}
