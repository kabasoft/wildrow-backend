import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * Verifies the `X-Wildrow-Signature: sha256={hash}` header on inbound MNO
 * webhook callbacks (Appendix C, Section 3B). The hash is an HMAC-SHA256 of
 * the raw request body, keyed with the shared MNO_HMAC_SECRET.
 *
 * Rejects the request with 401 if the signature is missing or does not match
 * — this is the platform's primary defense against spoofed settlement
 * confirmations.
 */
@Injectable()
export class MnoSignatureGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const header: string | undefined = request.headers['x-wildrow-signature'];

    if (!header || !header.startsWith('sha256=')) {
      throw new UnauthorizedException('Missing or malformed X-Wildrow-Signature header');
    }

    const providedHash = header.replace('sha256=', '');
    const secret = this.config.get<string>('mno.hmacSecret')!;
    const rawBody: Buffer = request.rawBody ?? Buffer.from(JSON.stringify(request.body));

    const expectedHash = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

    const valid =
      providedHash.length === expectedHash.length &&
      crypto.timingSafeEqual(Buffer.from(providedHash), Buffer.from(expectedHash));

    if (!valid) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    return true;
  }
}
