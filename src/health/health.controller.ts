import { Controller, Get } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('healthz')
  @ApiExcludeEndpoint()
  liveness() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('readyz')
  @ApiExcludeEndpoint()
  async readiness() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ready' };
  }
}
