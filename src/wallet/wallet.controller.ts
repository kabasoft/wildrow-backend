import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { WalletService } from './wallet.service';
import { WithdrawDto } from './wallet.dto';

@ApiTags('wallet')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('balance')
  @ApiOperation({ summary: 'Current principal, accrued yield, and total balance' })
  getBalance(@CurrentUser() user: { userId: string }) {
    return this.walletService.getBalance(user.userId);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Recent transaction history (top-ups, yield credits, withdrawals)' })
  getTransactions(@CurrentUser() user: { userId: string }) {
    return this.walletService.getTransactionHistory(user.userId);
  }

  @Post('withdraw')
  @ApiOperation({ summary: 'Redeem funds back to the investor mobile money wallet' })
  withdraw(@CurrentUser() user: { userId: string }, @Body() dto: WithdrawDto) {
    return this.walletService.withdraw(user.userId, dto.amountZmw);
  }
}
