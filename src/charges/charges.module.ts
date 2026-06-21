import { Module } from '@nestjs/common';
import { ChargesController } from './charges.controller';
import { ChargesService } from './charges.service';
import { MnoGatewayModule } from '../mno-gateway/mno-gateway.module';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [MnoGatewayModule, WebhooksModule],
  controllers: [ChargesController],
  providers: [ChargesService],
  exports: [ChargesService],
})
export class ChargesModule {}
