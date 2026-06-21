import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LedgerService } from './ledger.service';
import { PrismaService } from '../prisma/prisma.service';

describe('LedgerService', () => {
  let ledger: LedgerService;
  let prisma: jest.Mocked<Pick<PrismaService, 'tBillLot' | 'microUnit' | 'wallet' | 'transaction' | '$transaction'>>;

  beforeEach(async () => {
    prisma = {
      tBillLot: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'lot-1',
          totalUnits: 300,
          unitsIssued: 0,
        }),
        update: jest.fn(),
      },
      microUnit: { create: jest.fn() },
      wallet: { update: jest.fn() },
      transaction: { create: jest.fn() },
      $transaction: jest.fn((ops) => Promise.all(ops)),
    } as any;

    const moduleRef = await Test.createTestingModule({
      providers: [
        LedgerService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: { get: (key: string) => (key === 'ledger.netApy' ? 0.1 : key === 'ledger.grossApy' ? 0.12 : undefined) },
        },
      ],
    }).compile();

    ledger = moduleRef.get(LedgerService);
  });

  it('allocates one micro-unit per K100 and credits any sub-K100 residue to principal', async () => {
    const result = await ledger.allocateMicroUnits('user-1', 250);
    expect(result.unitsIssued).toBe(2);
    expect(result.residueCredited).toBeCloseTo(50);
    expect(prisma.wallet.update).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      data: { principalZmw: { increment: 250 } },
    });
  });

  it('computes straight-line daily yield at netApy/365 against principal', async () => {
    prisma.wallet.findMany = jest.fn().mockResolvedValue([
      { id: 'w1', userId: 'user-1', principalZmw: 1200 },
    ]) as any;
    prisma.wallet.update = jest.fn();

    const result = await ledger.accrueDailyYieldForAllWallets();

    const expectedDailyYield = 1200 * (0.1 / 365);
    expect(result.totalAccruedZmw).toBeCloseTo(expectedDailyYield, 4);
  });
});
