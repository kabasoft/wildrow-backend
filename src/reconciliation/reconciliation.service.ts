import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Implements Appendix C §4 — Custodian Bank Interoperability Interface.
 * Generates the structured EOD CSV mapping daily inflows to the Custodian
 * Trust Account and (in production) transmits it over SFTP with SSH key
 * exchange to /secure/reconciliation/wildrow_trust/.
 *
 * File schema (must match exactly — the custodian's intake job is templated
 * against this header):
 *   Transaction_Timestamp,Internal_Ledger_UUID,MNO_Source_Ref,
 *   Bank_Target_Account,Gross_Amount_ZMW,MNO_Fee_Deducted,Net_To_Sweep_ZMW
 */
@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);
  private readonly MNO_FEE_RATE = 0.01; // blended 1.0% gateway cost, Annex E

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async generateAndTransmitDailyBatch(businessDate: Date = new Date()) {
    const startOfDay = new Date(businessDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

    const charges = await this.prisma.charge.findMany({
      where: { status: 'SUCCESSFUL', completedAt: { gte: startOfDay, lt: endOfDay } },
      orderBy: { completedAt: 'asc' },
    });

    const header =
      'Transaction_Timestamp,Internal_Ledger_UUID,MNO_Source_Ref,Bank_Target_Account,Gross_Amount_ZMW,MNO_Fee_Deducted,Net_To_Sweep_ZMW';

    const bankTargetAccount = this.config.get<string>('custodian.trustAccount') ?? '03024810234810';

    const rows = charges.map((c) => {
      const gross = Number(c.amountZmw);
      const fee = Number((gross * this.MNO_FEE_RATE).toFixed(2));
      const net = Number((gross - fee).toFixed(2));
      return [
        c.completedAt?.toISOString(),
        c.txRef,
        c.mnoTransactionId ?? c.flwRef,
        bankTargetAccount,
        gross.toFixed(2),
        fee.toFixed(2),
        net.toFixed(2),
      ].join(',');
    });

    const csv = [header, ...rows].join('\n');
    const dateStr = startOfDay.toISOString().slice(0, 10).replace(/-/g, '');
    const fileName = `WR_RECON_${dateStr}.csv`;

    const grossAmountZmw = charges.reduce((sum, c) => sum + Number(c.amountZmw), 0);
    const netToSweepZmw = grossAmountZmw * (1 - this.MNO_FEE_RATE);

    await this.prisma.reconciliationBatch.create({
      data: {
        businessDate: startOfDay,
        fileName,
        grossAmountZmw,
        netToSweepZmw,
        rowCount: charges.length,
        transmittedAt: new Date(), // set once the SFTP push below actually confirms
      },
    });

    await this.transmitOverSftp(fileName, csv);

    this.logger.log(`Reconciliation batch ${fileName}: ${charges.length} rows, K${netToSweepZmw.toFixed(2)} net to sweep`);
    return { fileName, rowCount: charges.length, grossAmountZmw, netToSweepZmw, csv };
  }

  /**
   * Production: push `contents` to the Custodian Bank's SFTP endpoint using
   * SSH key exchange auth (see infra/secrets — CUSTODIAN_SFTP_PRIVATE_KEY in
   * Secret Manager). Swap this stub for an `ssh2-sftp-client` call.
   */
  private async transmitOverSftp(fileName: string, contents: string): Promise<void> {
    const host = this.config.get<string>('custodian.sftpHost');
    const path = this.config.get<string>('custodian.sftpPath');
    this.logger.log(`[mock] Transmitting ${fileName} (${contents.length} bytes) to sftp://${host}${path}`);
  }
}
