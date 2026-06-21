import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { MnoGatewayService } from '../mno-gateway/mno-gateway.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { CreateChargeDto } from './dto/create-charge.dto';

/**
 * Transaction Orchestration Unit — Appendix C §2A steps 1-3 and §3A.
 * Generates the immutable tx_ref, persists a PENDING charge, then fires the
 * tokenized charge request to the MNO rail to pop the STK push PIN prompt.
 */
@Injectable()
export class ChargesService {
  private readonly logger = new Logger(ChargesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mnoGateway: MnoGatewayService,
    private readonly webhooksService: WebhooksService,
    private readonly config: ConfigService,
  ) {}

  async createCharge(userId: string, dto: CreateChargeDto) {
    const txRef = `WR-MMF-${uuidv4()}`;

    const charge = await this.prisma.charge.create({
      data: {
        userId,
        txRef,
        amountZmw: dto.amount,
        currency: dto.currency,
        network: dto.network,
        phoneNumber: dto.phone_number,
        status: 'PENDING_CUSTOMER_PIN',
      },
    });

    const stk = await this.mnoGateway.triggerStkPush(dto.network, {
      txRef,
      amountZmw: dto.amount,
      phoneNumber: dto.phone_number,
    });

    await this.prisma.charge.update({
      where: { id: charge.id },
      data: { flwRef: stk.flwRef },
    });

    this.logger.log(`Charge ${txRef} created — STK push dispatched to ${dto.network} (${stk.flwRef})`);

    this.simulateSettlementOutsideProduction(charge.id, txRef, stk.flwRef, dto);

    // Response shape matches Appendix C §3A "Synchronous Response Parameter Matrix" exactly.
    return {
      status: 'success',
      message: 'Transaction initiated successfully',
      data: {
        id: charge.id,
        tx_ref: txRef,
        flw_ref: stk.flwRef,
        device_fingerprint: uuidv4().replace(/-/g, '').slice(0, 21),
        amount: dto.amount,
        currency: dto.currency,
        charging_status: stk.chargingStatus,
        created_at: charge.createdAt.toISOString(),
      },
    };
  }

  async getChargeByTxRef(txRef: string) {
    return this.prisma.charge.findUnique({ where: { txRef } });
  }

  /**
   * DEV/STAGING ONLY. Real settlement always arrives via the MNO calling
   * `POST /v3/mno-callback` directly — Wildrow never calls its own webhook
   * in production. This stands in for that external call so the platform
   * is exercisable end-to-end without live MNO credentials, by routing
   * through the exact same WebhooksService.handleMnoCallback() path a real
   * inbound callback would use.
   */
  private simulateSettlementOutsideProduction(
    chargeId: string,
    txRef: string,
    flwRef: string,
    dto: CreateChargeDto,
  ) {
    if (this.config.get<string>('nodeEnv') === 'production') return;

    const delay = this.config.get<number>('mno.mockLatencyMs')!;
    setTimeout(async () => {
      try {
        await this.webhooksService.handleMnoCallback({
          event: 'charge.completed',
          data: {
            id: chargeId,
            tx_ref: txRef,
            flw_ref: flwRef,
            amount: dto.amount,
            currency: dto.currency,
            status: 'successful',
            payment_type: 'mobilemoneyzambia',
            created_at: new Date().toISOString(),
            customer: { phone_number: dto.phone_number, fullname: dto.fullname },
            payment_details: {
              mno_transaction_id: `${dto.network}.${Math.floor(1e9 + Math.random() * 9e9)}`,
              operator: dto.network,
            },
          },
        });
      } catch (err) {
        this.logger.error(`Dev settlement simulation failed for ${txRef}`, err as Error);
      }
    }, delay);
  }
}
