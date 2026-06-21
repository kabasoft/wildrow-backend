import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  async getBalance(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');

    const principal = Number(wallet.principalZmw);
    const accruedYield = Number(wallet.accruedYieldZmw);

    return {
      principalZmw: principal,
      accruedYieldZmw: accruedYield,
      totalBalanceZmw: principal + accruedYield,
      updatedAt: wallet.updatedAt,
    };
  }

  async getTransactionHistory(userId: string, take = 25) {
    return this.prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  /**
   * Initiates a redemption back to the investor's mobile wallet. In
   * production this triggers a B2C disbursement from the Custodian Bank
   * Trust Account (T+0/T+1 partial liquidity, per Appendix C/Part-1
   * Criterion 3.7). Here we settle the ledger synchronously and log the
   * disbursement instruction.
   */
  async withdraw(userId: string, amountZmw: number) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');

    const available = Number(wallet.principalZmw) + Number(wallet.accruedYieldZmw);
    if (amountZmw > available) {
      throw new BadRequestException('Withdrawal amount exceeds available balance');
    }

    // Draw down accrued yield first, then principal — preserves whole K100
    // micro-units for as long as possible.
    const fromYield = Math.min(Number(wallet.accruedYieldZmw), amountZmw);
    const fromPrincipal = amountZmw - fromYield;

    await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { userId },
        data: {
          accruedYieldZmw: { decrement: fromYield },
          principalZmw: { decrement: fromPrincipal },
        },
      }),
      this.prisma.transaction.create({
        data: {
          userId,
          type: 'WITHDRAWAL',
          amountZmw,
          reference: 'Disbursement instruction queued to Custodian Bank B2C rail',
        },
      }),
    ]);

    return { status: 'queued', amountZmw, etaMinutes: 15 };
  }
}
