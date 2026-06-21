import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ChargesService } from './charges.service';
import { CreateChargeDto } from './dto/create-charge.dto';

/**
 * Path mirrors the report's published contract:
 * https://api.wildrow.internal/v3/charges?type=mobile_money_zambia
 */
@ApiTags('charges')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v3/charges')
export class ChargesController {
  constructor(private readonly chargesService: ChargesService) {}

  @Post()
  @ApiQuery({ name: 'type', example: 'mobile_money_zambia' })
  @ApiOperation({ summary: 'Initiate a fractional cash-in top-up (triggers an MNO STK push)' })
  create(
    @CurrentUser() user: { userId: string },
    @Query('type') _type: string,
    @Body() dto: CreateChargeDto,
  ) {
    return this.chargesService.createCharge(user.userId, dto);
  }

  @Get(':txRef/status')
  @ApiOperation({ summary: 'Poll settlement status for a previously initiated charge' })
  async getStatus(@Param('txRef') txRef: string) {
    const charge = await this.chargesService.getChargeByTxRef(txRef);
    return { txRef, status: charge?.status ?? 'NOT_FOUND' };
  }
}
