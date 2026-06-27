import { Injectable } from '@nestjs/common';
import { MnoProvider, StkPushRequest, StkPushResult } from '../mno-provider.interface';

@Injectable()
export class AirtelProvider implements MnoProvider {
  readonly network = 'AIRTEL' as const;

  async triggerStkPush(req: StkPushRequest): Promise<StkPushResult> {
    void req;
    // Production: POST to Airtel Money Collection API /merchant/v1/payments
    return {
      flwRef: `MNO-AIRTEL-${Math.floor(100000000 + Math.random() * 900000000)}`,
      chargingStatus: 'PENDING_CUSTOMER_PIN',
    };
  }
}
