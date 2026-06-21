import { Module } from '@nestjs/common';
import { MnoGatewayService } from './mno-gateway.service';
import { MtnProvider } from './providers/mtn.provider';
import { AirtelProvider } from './providers/airtel.provider';
import { ZamtelProvider } from './providers/zamtel.provider';

@Module({
  providers: [MnoGatewayService, MtnProvider, AirtelProvider, ZamtelProvider],
  exports: [MnoGatewayService],
})
export class MnoGatewayModule {}
