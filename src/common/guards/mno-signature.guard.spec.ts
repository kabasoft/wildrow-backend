import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import { MnoSignatureGuard } from './mno-signature.guard';

function makeContext(headers: Record<string, string>, rawBody: Buffer) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers, rawBody, body: JSON.parse(rawBody.toString()) }),
    }),
  } as any;
}

describe('MnoSignatureGuard', () => {
  const secret = 'test-secret';
  const config = { get: () => secret } as unknown as ConfigService;
  const guard = new MnoSignatureGuard(config);

  const body = Buffer.from(JSON.stringify({ event: 'charge.completed' }));
  const validSig = crypto.createHmac('sha256', secret).update(body).digest('hex');

  it('accepts a correctly signed payload', () => {
    const ctx = makeContext({ 'x-wildrow-signature': `sha256=${validSig}` }, body);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('rejects a tampered payload (signature no longer matches)', () => {
    const tampered = Buffer.from(JSON.stringify({ event: 'charge.completed', amount: 999999 }));
    const ctx = makeContext({ 'x-wildrow-signature': `sha256=${validSig}` }, tampered);
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('rejects a request with no signature header at all', () => {
    const ctx = makeContext({}, body);
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });
});
