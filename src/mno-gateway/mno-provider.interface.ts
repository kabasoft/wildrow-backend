export interface StkPushRequest {
  txRef: string;
  amountZmw: number;
  phoneNumber: string;
}

export interface StkPushResult {
  flwRef: string;
  chargingStatus: 'PENDING_CUSTOMER_PIN';
}

/**
 * Common contract every MNO rail adapter must satisfy. Production
 * implementations call out to MTN MoMo, Airtel Money, and Zamtel Kwacha
 * APIs respectively; here they're mocked to asynchronously fire Wildrow's
 * own webhook endpoint after a short delay, simulating the customer
 * entering their PIN on the STK push prompt.
 */
export interface MnoProvider {
  readonly network: 'MTN' | 'AIRTEL' | 'ZAMTEL';
  triggerStkPush(req: StkPushRequest): Promise<StkPushResult>;
}
