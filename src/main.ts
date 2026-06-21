import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  // rawBody:true is required so MnoSignatureGuard can HMAC-verify the exact
  // bytes the MNO signed — re-serializing the parsed JSON body would break
  // signature verification on whitespace/key-order differences.
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const config = app.get(ConfigService);

  app.use(helmet());
  app.enableCors({ origin: config.get<string[]>('corsOrigins'), credentials: true });
  app.setGlobalPrefix('api', { exclude: ['healthz', 'readyz'] });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  if (config.get('nodeEnv') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Wildrow Crowdsourced Micro-Investment Platform API')
      .setDescription('Onboarding, fractional ledger, charges, webhooks, and reconciliation — Project Wr-Mmf-06')
      .setVersion('2026.1.2')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = config.get<number>('port')!;
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`Wildrow backend listening on :${port}`);
}

bootstrap();
