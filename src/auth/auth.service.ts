import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

interface OtpRecord {
  code: string;
  expiresAt: number;
}

/**
 * Phone + OTP authentication, standing in for the production flow where the
 * OTP is delivered via the MNO's SMS gateway (or USSD session) rather than
 * returned in the API response.
 *
 * NOTE: the in-memory Map below is fine for a single Cloud Run instance
 * demo. In production this belongs in Redis (Memorystore) so OTPs survive
 * across instances/restarts and can expire reliably under concurrency.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly otpStore = new Map<string, OtpRecord>();
  private readonly OTP_TTL_MS = 5 * 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async requestOtp(phoneNumber: string): Promise<{ message: string; devCode?: string }> {
    const code = String(Math.floor(1000 + Math.random() * 9000));
    this.otpStore.set(phoneNumber, { code, expiresAt: Date.now() + this.OTP_TTL_MS });

    // In production: dispatch via MNO SMS/USSD gateway here instead of logging.
    this.logger.log(`OTP for ${phoneNumber}: ${code} (expires in 5 min)`);

    const isProd = process.env.NODE_ENV === 'production';
    return {
      message: 'OTP sent to mobile number',
      ...(isProd ? {} : { devCode: code }), // surfaced only outside production for local testing
    };
  }

  async verifyOtp(phoneNumber: string, code: string): Promise<{ accessToken: string; userId: string }> {
    const record = this.otpStore.get(phoneNumber);
    if (!record || record.expiresAt < Date.now() || record.code !== code) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }
    this.otpStore.delete(phoneNumber);

    const user = await this.prisma.user.upsert({
      where: { phoneNumber },
      update: {},
      create: { phoneNumber, wallet: { create: {} } },
    });

    const accessToken = this.jwt.sign({ sub: user.id, phoneNumber: user.phoneNumber });
    return { accessToken, userId: user.id };
  }
}
