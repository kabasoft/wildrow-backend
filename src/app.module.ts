import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { WalletModule } from './wallet/wallet.module';
import { LedgerModule } from './ledger/ledger.module';
import { ChargesModule } from './charges/charges.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { MnoGatewayModule } from './mno-gateway/mno-gateway.module';
import { ReconciliationModule } from './reconciliation/reconciliation.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]), // basic abuse protection ahead of the WAF layer
    ScheduleModule.forRoot(), // powers LedgerCron (nightly accrual + EOD sweep export)
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    WalletModule,
    MnoGatewayModule,
    LedgerModule,
    ChargesModule,
    WebhooksModule,
    ReconciliationModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
