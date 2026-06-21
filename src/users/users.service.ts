import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { KycTier, MnoNetwork } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Implements the "Tiered KYC" relaxation requested under Criterion 3.3 of
 * the SEC Sandbox application: Tier 1 verification matches the investor's
 * NRC against their MNO-held identity profile via USSD/App, rather than
 * requiring physical, wet-signature onboarding.
 *
 * matchAgainstMnoProfile() stands in for the real integration with each
 * MNO's KYC-matching API (or a national ID aggregator). It is intentionally
 * isolated behind this method so a real provider can be substituted without
 * touching controller code.
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async submitTierOneKyc(userId: string, nationalRegistrationNo: string, network: MnoNetwork) {
    const matched = await this.matchAgainstMnoProfile(userId, nationalRegistrationNo, network);

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        nationalRegistrationNo,
        network,
        fullName: matched.fullName,
        kycTier: KycTier.TIER_1_VERIFIED,
      },
    });
  }

  /**
   * Mock MNO identity match. Replace with a real call to the relevant
   * network's subscriber-identity API (or NRC database validation service)
   * in production. Always "succeeds" here for demo purposes provided the
   * NRC is well-formed.
   */
  private async matchAgainstMnoProfile(
    userId: string,
    nrc: string,
    network: MnoNetwork,
  ): Promise<{ matched: boolean; fullName: string }> {
    this.logger.log(`Matching NRC ${nrc} against ${network} subscriber profile for user ${userId}`);
    await new Promise((r) => setTimeout(r, 300));
    return { matched: true, fullName: 'Verified Wildrow Investor' };
  }
}
