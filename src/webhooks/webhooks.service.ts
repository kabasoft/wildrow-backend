import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerService } from '../ledger/ledger.service';
import { MnoCallbackDto } from './dto/mno-callback.dto';

/**
 * Reconciliation Event handler — Appendix C §2A steps 5-6. Receives the
 * MNO's settlement confirmation, marks the charge SUCCESSFUL, and credits
 * the investor's fractional ledger at that day's NAV.
 *
 * Idempotent by tx_ref: a webhook that's redelivered (a normal occurrence
 * with at-least-once delivery guarantees) does not double-credit a wallet.
 */
@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
  ) {}

  async handleMnoCallback(payload: MnoCallbackDto) {
    const { data, event } = payload;

    const charge = await this.prisma.charge.findUnique({ where: { txRef: data.tx_ref } });
    if (!charge) {
      throw new NotFoundException(`No charge found for tx_ref ${data.tx_ref}`);
    }

    if (charge.status === 'SUCCESSFUL') {
      this.logger.warn(`Duplicate webhook delivery for ${data.tx_ref} — ignoring (already settled)`);
      return { status: 'ignored', reason: 'already_processed' };
    }

    if (event !== 'charge.completed' || data.status !== 'successful') {
      await this.prisma.charge.update({ where: { id: charge.id }, data: { status: 'FAILED' } });
      this.logger.warn(`Charge ${data.tx_ref} failed/declined upstream: ${event}/${data.status}`);
      return { status: 'recorded', chargeStatus: 'FAILED' };
    }

    await this.prisma.charge.update({
      where: { id: charge.id },
      data: {
        status: 'SUCCESSFUL',
        mnoTransactionId: data.payment_details.mno_transaction_id,
        completedAt: new Date(data.created_at),
      },
    });

    const allocation = await this.ledger.allocateMicroUnits(charge.userId, Number(data.amount));

    this.logger.log(
      `Charge ${data.tx_ref} settled — ${allocation.unitsIssued} micro-units credited to user ${charge.userId}`,
    );

    return { status: 'processed', allocation };
  }
}
