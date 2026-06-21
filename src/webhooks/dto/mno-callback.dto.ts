import { ApiProperty } from '@nestjs/swagger';

class WebhookCustomerDto {
  @ApiProperty() phone_number!: string;
  @ApiProperty() fullname!: string;
}

class WebhookPaymentDetailsDto {
  @ApiProperty() mno_transaction_id!: string;
  @ApiProperty() operator!: string;
}

class WebhookDataDto {
  @ApiProperty() id!: number | string;
  @ApiProperty() tx_ref!: string;
  @ApiProperty() flw_ref!: string;
  @ApiProperty() amount!: number;
  @ApiProperty() currency!: string;
  @ApiProperty({ example: 'successful' }) status!: string;
  @ApiProperty() payment_type!: string;
  @ApiProperty() created_at!: string;
  @ApiProperty({ type: WebhookCustomerDto }) customer!: WebhookCustomerDto;
  @ApiProperty({ type: WebhookPaymentDetailsDto }) payment_details!: WebhookPaymentDetailsDto;
}

/** Mirrors Appendix C §3B "Outbound Asynchronous Webhook Notification" exactly. */
export class MnoCallbackDto {
  @ApiProperty({ example: 'charge.completed' })
  event!: string;

  @ApiProperty({ type: WebhookDataDto })
  data!: WebhookDataDto;
}
