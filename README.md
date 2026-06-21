# wildrow-backend

API, fractional ledger & NAV engine, and MNO transaction orchestration for the
**Wildrow Crowdsourced Micro-Investment Platform** — built for the Regulatory
Sandbox pilot (Project Wr-Mmf-06).

NestJS + TypeScript · PostgreSQL (Prisma) · Cloud Run

## What's in here

| Module | Responsibility |
|---|---|
| `auth/` | Phone-number + OTP login, JWT issuance |
| `users/` | Tier 1 (MNO-matched) KYC onboarding — Criterion 3.3 relaxation |
| `wallet/` | Balance, transaction history, withdrawal |
| `ledger/` | Fractional micro-unit allocation, daily amortized yield accrual, NAV |
| `charges/` | `POST /v3/charges` — initiates the MNO STK push (cash-in) |
| `webhooks/` | `POST /v3/mno-callback` — HMAC-verified settlement confirmation |
| `mno-gateway/` | MTN / Airtel / Zamtel rail adapters (mocked) |
| `reconciliation/` | Generates & transmits the daily EOD custodian CSV |

Endpoint paths and payload shapes mirror **Appendix C** of the Regulatory
Sandbox Admission Report exactly, so the published API contract in the report
is directly testable against this implementation.

## Local development

```bash
cp .env.example .env
docker compose up --build
# API:    http://localhost:8080/api
# Docs:   http://localhost:8080/api/docs
```

Without Docker:

```bash
npm ci
npx prisma migrate dev
npm run start:dev
```

## Testing

```bash
npm run lint
npm run test
npm run test:cov
```

`ledger.service.spec.ts` and `mno-signature.guard.spec.ts` cover the two
highest-stakes pieces of logic: fractional-unit math and webhook
authenticity — start there if you're auditing this service.

## Deploying

See `cloudbuild.yaml` in this repo and `/CI_CD_GUIDE.md` in the
`wildrow-infra` repo for the full Cloud Build → Artifact Registry → Cloud Run
pipeline, including how database migrations run as a Cloud Run Job ahead of
traffic cutover.

## Environment variables

See `.env.example`. In every deployed environment, `DATABASE_URL`,
`JWT_SECRET`, and `MNO_HMAC_SECRET` are injected from Secret Manager at
deploy time — they are never committed or baked into the image.
