import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MnoNetwork } from '@prisma/client';
import * as crypto from 'crypto';
import { MnoProvider, StkPushRequest, StkPushResult } from './mno-provider.interface';
import { MtnProvider } from './providers/mtn.provider';
import { AirtelProvider } from './providers/airtel.provider';
import { ZamtelProvider } from './providers/zamtel.provider';

/**
 * Fans out to the correct telecom rail adapter (MTN / Airtel / Zamtel) and,
 * in this mock build, schedules a self-call to our own webhook endpoint
 * after MNO_MOCK_LATENCY_MS — simulating the customer authorizing the STK
 * push on their device. In production the MNO calls the webhook directly;
 * Wildrow never simulates its own callbacks.
 */
@Injectable()
export class MnoGatewayService {
  private readonly logger = new Logger(MnoGatewayService.name);
  private readonly providers: Record<MnoNetwork, MnoProvider>;

  constructor(
    private readonly config: ConfigService,
    mtn: MtnProvider,
    airtel: AirtelProvider,
    zamtel: ZamtelProvider,
  ) {
    this.providers = { MTN: mtn, AIRTEL: airtel, ZAMTEL: zamtel };
  }

  async triggerStkPush(network: MnoNetwork, req: StkPushRequest): Promise<StkPushResult> {
    const provider = this.providers[network];
    this.logger.log(`Triggering STK push on ${network} for ${req.txRef} (K${req.amountZmw})`);
    return provider.triggerStkPush(req);
  }

  /** Signs a webhook payload exactly as a real MNO/aggregator would, per Appendix C §3B. */
  signPayload(rawBody: string): string {
    const secret = this.config.get<string>('mno.hmacSecret')!;
    return crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  }
}
