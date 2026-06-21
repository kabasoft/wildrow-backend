export default () => ({
  port: parseInt(process.env.PORT ?? '8080', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: process.env.DATABASE_URL,
  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
  },
  mno: {
    // Shared HMAC key used to sign outbound charge requests and verify
    // inbound webhook callbacks (X-Wildrow-Signature header).
    hmacSecret: process.env.MNO_HMAC_SECRET ?? 'dev-hmac-secret-change-me',
    mockLatencyMs: parseInt(process.env.MNO_MOCK_LATENCY_MS ?? '1200', 10),
  },
  custodian: {
    sftpHost: process.env.CUSTODIAN_SFTP_HOST ?? 'sftp.custodian-trust.zm',
    sftpPath: process.env.CUSTODIAN_SFTP_PATH ?? '/secure/reconciliation/wildrow_trust/',
    minLiquidityBufferPct: parseFloat(process.env.CUSTODIAN_MIN_LIQUIDITY_PCT ?? '0.15'),
  },
  ledger: {
    // Blended portfolio yield assumptions (Annex E)
    grossApy: parseFloat(process.env.LEDGER_GROSS_APY ?? '0.12'),
    managementFeeApy: parseFloat(process.env.LEDGER_MGMT_FEE_APY ?? '0.02'),
    netApy: parseFloat(process.env.LEDGER_NET_APY ?? '0.10'),
  },
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173').split(','),
});
