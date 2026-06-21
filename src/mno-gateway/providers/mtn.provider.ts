import { Injectable } from '@nestjs/common';
import { MnoProvider, StkPushRequest, StkPushResult } from '../mno-provider.interface';

@Injectable()
export class MtnProvider implements MnoProvider {
  readonly network = 'MTN' as const;

  async triggerStkPush(req: StkPushRequest): Promise<StkPushResult> {
    // Production: POST to MTN MoMo Collections API /requesttopay
    return {
      flwRef: `MNO-MTN-${Math.floor(100000000 + Math.random() * 900000000)}`,
      chargingStatus: 'PENDING_CUSTOMER_PIN',
    };
  }
}
