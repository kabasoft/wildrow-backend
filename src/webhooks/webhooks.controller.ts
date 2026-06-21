import { Controller, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { Request } from 'express';
import { MnoSignatureGuard } from '../common/guards/mno-signature.guard';
import { WebhooksService } from './webhooks.service';
import { MnoCallbackDto } from './dto/mno-callback.dto';

/**
 * Path mirrors the report's published contract:
 * https://webhook.wildrow.com/v3/mno-callback
 *
 * Deliberately NOT behind JwtAuthGuard — the caller is the MNO/aggregator,
 * not an investor. Authenticity is instead established by MnoSignatureGuard
 * validating the X-Wildrow-Signature HMAC header against the raw body.
 */
@Controller('v3/mno-callback')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post()
  @HttpCode(200)
  @UseGuards(MnoSignatureGuard)
  @ApiExcludeEndpoint() // not part of the investor-facing Swagger surface
  handleCallback(@Req() req: Request) {
    return this.webhooksService.handleMnoCallback(req.body as MnoCallbackDto);
  }
}
