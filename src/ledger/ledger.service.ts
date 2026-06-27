import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Implements Appendix D §2A — Automated Micro-Fractionalization Ledger
 * Mechanics: a single K30,000 T-Bill lot is split into 300 fungible K100
 * MicroUnits at issuance. Retail top-ups are matched against the open lot
 * rather than bidding directly on the primary market.
 */
@Injectable()
export class LedgerService {
  private readonly logger = new Logger(LedgerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Returns the most recently opened lot if it still has unallocated
   * capacity, otherwise auctions a fresh K30,000 lot. Prisma can't compare
   * two columns (unitsIssued < totalUnits) in a `where` clause without a raw
   * query, so capacity is checked in code against the latest lot.
   */
  async getOrOpenActiveLot() {
    const candidate = await this.prisma.tBillLot.findFirst({ orderBy: { purchasedAt: 'desc' } });

    if (candidate && candidate.unitsIssued < candidate.totalUnits) {
      return candidate;
    }

    return this.openNewLot();
  }

  /** Registers a freshly auctioned K30,000 lot, per Appendix D §2A — "Asset Ingestion Pipeline". */
  async openNewLot(tenorDays = 364, grossApy = this.config.get<number>('ledger.grossApy')!) {
    const lotSize = 30000;
    const unitSize = 100;
    const lot = await this.prisma.tBillLot.create({
      data: {
        isinOrAuctionId: `BOZ-${tenorDays}D-${Date.now()}`,
        tenorDays,
        nominalRateApy: grossApy,
        lotSizeZmw: lotSize,
        unitSizeZmw: unitSize,
        totalUnits: lotSize / unitSize, // 300
        maturesAt: new Date(Date.now() + tenorDays * 86400_000),
      },
    });
    this.logger.log(`Opened new T-Bill lot ${lot.isinOrAuctionId} (${lot.totalUnits} micro-units @ K${unitSize})`);
    return lot;
  }

  /**
   * Splits an inbound top-up into K100 MicroUnits and credits the
   * investor's wallet principal. Called once a charge is confirmed
   * SUCCESSFUL via the MNO webhook.
   */
  async allocateMicroUnits(userId: string, amountZmw: number) {
    const unitSize = 100;
    const wholeUnits = Math.floor(amountZmw / unitSize);
    const remainder = amountZmw - wholeUnits * unitSize; // any non-K100-multiple residue is still credited to principal

    let remaining = wholeUnits;

    while (remaining > 0) {
      const lot = await this.getOrOpenActiveLot();
      const capacity = lot.totalUnits - lot.unitsIssued;
      const toIssue = Math.min(capacity, remaining);

      const navAtIssue = unitSize; // straight-line NAV at par for newly issued micro-units

      await this.prisma.$transaction([
        ...Array.from({ length: toIssue }).map(() =>
          this.prisma.microUnit.create({
            data: { userId, lotId: lot.id, faceValueZmw: unitSize, navAtIssue },
          }),
        ),
        this.prisma.tBillLot.update({
          where: { id: lot.id },
          data: { unitsIssued: { increment: toIssue } },
        }),
      ]);

      remaining -= toIssue;
    }

    await this.prisma.wallet.update({
      where: { userId },
      data: { principalZmw: { increment: amountZmw } },
    });

    await this.prisma.transaction.create({
      data: { userId, type: 'TOPUP', amountZmw, reference: `${wholeUnits} micro-units @ K${unitSize}` },
    });

    return { unitsIssued: wholeUnits, residueCredited: remainder };
  }

  /**
   * Daily Amortized Cost Yield Module (Appendix D §2B). Run once nightly at
   * 23:59:59 CAT by ledger.cron.ts. Straight-line day-count: dailyRate =
   * netApy / 365, applied against each wallet's principal.
   */
  async accrueDailyYieldForAllWallets() {
    const netApy = this.config.get<number>('ledger.netApy')!;
    const dailyRate = netApy / 365;

    const wallets = await this.prisma.wallet.findMany({ where: { principalZmw: { gt: 0 } } });
    let totalAccrued = 0;

    for (const wallet of wallets) {
      const principal = Number(wallet.principalZmw);
      const dailyYield = principal * dailyRate;
      totalAccrued += dailyYield;

      await this.prisma.$transaction([
        this.prisma.wallet.update({
          where: { id: wallet.id },
          data: { accruedYieldZmw: { increment: dailyYield } },
        }),
        this.prisma.transaction.create({
          data: { userId: wallet.userId, type: 'YIELD_CREDIT', amountZmw: dailyYield, reference: 'Daily amortized accrual' },
        }),
      ]);
    }

    this.logger.log(`Accrued daily yield for ${wallets.length} wallets — total K${totalAccrued.toFixed(2)}`);
    return { walletsProcessed: wallets.length, totalAccruedZmw: totalAccrued };
  }
}
