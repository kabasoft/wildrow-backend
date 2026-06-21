import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { LedgerService } from './ledger.service';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('ledger')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/ledger')
export class LedgerController {
  constructor(
    private readonly ledger: LedgerService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('active-pool')
  @ApiOperation({ summary: 'Current open T-Bill lot and remaining micro-unit capacity' })
  async getActivePool() {
    const lot = await this.ledger.getOrOpenActiveLot();
    return {
      isinOrAuctionId: lot.isinOrAuctionId,
      tenorDays: lot.tenorDays,
      nominalRateApy: lot.nominalRateApy,
      totalUnits: lot.totalUnits,
      unitsIssued: lot.unitsIssued,
      unitsRemaining: lot.totalUnits - lot.unitsIssued,
      maturesAt: lot.maturesAt,
    };
  }
}
