import { Injectable } from '@nestjs/common';
import { MnoProvider, StkPushRequest, StkPushResult } from '../mno-provider.interface';

@Injectable()
export class ZamtelProvider implements MnoProvider {
  readonly network = 'ZAMTEL' as const;

  async triggerStkPush(req: StkPushRequest): Promise<StkPushResult> {
    void req;
    // Production: POST to Zamtel Kwacha API
    return {
      flwRef: `MNO-ZAMTEL-${Math.floor(100000000 + Math.random() * 900000000)}`,
      chargingStatus: 'PENDING_CUSTOMER_PIN',
    };
  }
}
