# AUDMA OS Production Implementation Tasks

**Status:** In progress (local validation, PostgreSQL schema baseline, and AI resilience; production gates blocked)  
**Plan:** [PRODUCTION_IMPLEMENTATION_PLAN.md](./PRODUCTION_IMPLEMENTATION_PLAN.md)  
**Runbook:** [PRODUCTION_READINESS_RUNBOOK.md](./PRODUCTION_READINESS_RUNBOOK.md)  
**Scope:** Single-tenant production deployment for AUDMA Integrated Services Ltd

## How to Track

- Change `[ ]` to `[x]` only when the task's acceptance evidence is available.
- Add an owner, target date, evidence link, and blocker in the final columns before execution.
- Do not mark legal, residency, payroll, privacy, or release gates complete without written approval from the accountable reviewer.
- Keep this tracker synchronized with the project plan; record scope changes and decisions in the project decision log.

## Execution Log

### 2026-10-16

- [x] Added `bun run test` using Node's built-in test runner via `tsx`.
- [x] Added focused tests for exact decimal arithmetic, malformed/non-finite values, balancing, and percentage rounding in [financial-math.test.ts](../tests/financial-math.test.ts).
- [x] Changed `toDecimal` to reject malformed and non-finite values rather than silently converting them to zero; null, undefined, and empty strings still map to zero.
- [x] Added pre-mutation journal checks for minimum line count, valid calendar dates, active/existing accounts, non-negative cent-precision amounts, and exactly one positive debit or credit per line.
- [x] Guarded invoice approval to `PENDING_AUDIT`, vendor payment to `POSTED_TO_GL`, receipt approval/rejection to `PENDING_APPROVAL`, and restricted physical receipt deletion to drafts; database-level idempotency remains unimplemented.
- [x] Rejected duplicate open clock-ins and repeat leave decisions; attendance/leave remain in-memory and have no server-side authorization yet.
- [x] Corrected DB and storage selector values to match declared provider identifiers.
- [x] Removed production synthetic AI output for invoice generation and invoice/receipt extraction; client adapters now propagate failures, and the UI clears stale invoice OCR, displays failure notices, and requires human confirmation before posting.
- [x] Receipt OCR failures route to manual entry with the source image retained; receipt submission requires explicit review confirmation.
- [x] Verified the focused test suite (11 passing), `bun run lint`, and `bun run build`.
- [x] Run production build after this execution slice; existing Vite config and bundle-size warnings remain.
- [x] Added AI API request validation, an 8 MiB text-payload bound, a 10 MiB JSON body limit, a server-provider allowlist, and 30-second timeouts for outbound fetch providers.
- [x] Made invoice and receipt extraction return `AI_UNAVAILABLE` after provider failure in every environment; unsupported provider IDs no longer fall through to Gemini.
- [x] Aligned visible AI selectors and health metadata with the four server-wired providers; added request-validation regressions (13 tests passing).
- [ ] P8 remains partial: route authentication/authorization, managed-secret enforcement, strict response schema validation, and route-level failure tests remain. Gemini timeout, process-local throttling, and bounded retries/breaker are tracked in the 2026-10-18 evidence below.
- [x] Added CI for frozen Bun install, type-check, tests, and build; its workflow is now configured for self-hosted Forgejo Actions with PostgreSQL migration and container steps.
- [ ] Continue remaining plan tasks: complete P0 legal/provider decisions, P2 schema and reconciled opening balances, P3 auth and RBAC, P4 ledger invariants, P8 AI/provider guardrails, and P10 deployment approval gates. No cloud services, legal approvals, or production deployment have been completed.

### 2026-10-18

- [x] Added unit-tested in-memory fixed-window throttling (20 requests/minute per observed client IP, bounded key storage) ahead of AI JSON parsing.
- [x] Added per-provider circuit breakers and transient-only retry policy with jittered backoff: one initial attempt plus at most three retries; permanent errors are not retried.
- [x] Set Gemini SDK HTTP timeout to 30 seconds and internal retry attempts to one so retry policy is bounded in one layer.
- [x] Added dedicated limiter/retry/circuit tests; `bun run test` now passes 18 tests, and `bun run lint` passes.
- [x] Verified `bun run build` after resilience integration; existing Vite config and bundle-size warnings remain.
- [ ] These resilience controls are process-local and are not distributed across instances; route-level HTTP tests and production-grade shared rate-limit/circuit state remain.
- [ ] P0 approvals, P2 source reconciliation/schema approval, P3 persistent identity/auth, P4 database transactions/period controls, and P10 cloud/restore/release gates remain blocked or unimplemented.
- [x] Audited the repository, `.env` key names (without reading values), package/lock files, docs, and deployment files before choosing infrastructure dependencies; no prior PostgreSQL driver or migration tool existed.
- [x] Added `pg`, `node-pg-migrate`, and PGlite; created an initial tenant-scoped PostgreSQL schema, normalized six-role/13-permission matrix, hashed session table, accounting periods, ledger/AP/receipt/HR/payroll, audit, and outbox tables.
- [x] Added database-level journal posting validation, open-period and active-account checks, posted-entry/line immutability, idempotency/reference indexes, attendance uniqueness, and same-organization actor foreign keys.
- [x] Added PGlite up/down/up regression tests for schema, role matrix, tenant-scoped sessions, and journal invariants (20 tests pass).
- [x] Added local PostgreSQL Compose service, multi-stage Bun container, real PostgreSQL up/down/up and container build steps to self-hosted Forgejo Actions, and a bounded real `SELECT 1` database probe.
- [x] Set local Ollama as the default AI provider; external provider credentials are opt-in and the default does not contact a commercial AI endpoint.
- [x] Kept the PostgreSQL driver server-only; provider health uses a bounded API probe and the production readiness endpoint remains closed until workflows are persistent.
- [x] Audited and corrected README/API/provider/security/architecture docs that overstated provider support, server-side RBAC, audit durability, or offline AI fallback behavior.
- [x] Added a separate development-only Compose environment example; Compose syntax validates without touching the existing ignored `.env`.
- [ ] Docker Desktop daemon is unavailable in this workspace; real PostgreSQL migration and container build will be exercised by Forgejo CI after a runner is configured.
- [ ] PostgreSQL schema remains an initial engineering baseline; no domain repositories, data import, source-supported opening balance, authentication flow, or production DB operation has been completed.

| ID | Status | Owner | Target | Evidence / blocker |
| --- | --- | --- | --- | --- |
| P0-01 | Not started | TBD | TBD | Cross-border/residency legal assessment |
| P0-02 | Not started | TBD | TBD | Nigerian payroll/accounting rule sign-off |
| P0-03 | Not started | TBD | TBD | Seven-year retention schedule approval |
| P0-04 | Not started | TBD | TBD | Hosting/provider decision record |
| P1-01 | In progress | TBD | TBD | Unit, PGlite schema, TypeScript, lint, and build checks exist; API/e2e tooling remains |
| P1-02 | In progress | TBD | TBD | Forgejo Actions workflow runs checks and PostgreSQL migration/container jobs; runner, migration CI execution, and dependency/security scanning evidence remain |
| P2-01 | In progress | TBD | TBD | Initial normalized schema and migrations added; Finance/security review, schema completeness review, and domain repositories remain |
| P3-01 | In progress | TBD | TBD | Hashed opaque-session table added; OIDC login, cookie issuance, rotation, revocation service, and auth tests remain |
| P4-01 | Not started | TBD | TBD | Ledger reconciliation test report |
| P4-03 | In progress | TBD | TBD | Journal amount/account/date validation added; accounting-period checks remain |
| P4-06 | In progress | TBD | TBD | In-memory invoice/payment/receipt transitions and draft-only deletion added; DB-backed workflow/idempotency remains |
| P8-01 | In progress | TBD | TBD | AI selectors/health metadata match the four wired server providers; database/storage provider approval and validation remain |
| P8-04 | In progress | TBD | TBD | AI body/provider validation, per-IP in-memory throttling, fetch and Gemini timeouts added; auth, authorization, managed secrets, and distributed limits remain |
| P8-07 | In progress | TBD | TBD | Four-attempt transient retry and process-local circuit breaker added; shared state, operational metrics, and recovery validation remain |
| P8-08 | In progress | TBD | TBD | Fail-closed extraction plus bounded retry/circuit behavior added; full manual AP entry and route-level resilience tests remain |
| P5-01 | Not started | TBD | TBD | Payroll golden cases signed off |
| P6-01 | Not started | TBD | TBD | Outbox retry/idempotency evidence |
| P7-01 | Not started | TBD | TBD | Privacy/security review |
| P8-09 | Not started | TBD | TBD | AI resilience and manual fallback tests |
| P9-01 | Not started | TBD | TBD | Frontend e2e and performance report |
| P10-01 | Not started | TBD | TBD | Compose/container definitions added for local use; approved infrastructure, secrets, deployment, and restore drill remain |

## P0 - Compliance and Architecture Decisions

- [ ] **P0-01** Determine whether the requirement is Nigeria-only data residency or legally approved cross-border processing. Assess AWS `af-south-1`, Lagos providers, Neon, and object-storage candidates by exact data location, backups, support access, subprocessors, and contractual safeguards.
- [ ] **P0-02** Obtain counsel/accounting approval for CAMA/FIRS/JTB and applicable Nigerian tax legislation, effective dates, CRA/PIT methodology, VAT treatment, pensionable earnings, 8% employee/10% employer pension, NHF eligibility, ITF basis/threshold, NSITF, remittance, and rounding.
- [ ] **P0-03** Approve retention periods by record type, including the proposed seven-year ledger/payroll window, legal holds, start-of-period rule, and NDPA data-subject request handling.
- [ ] **P0-04** Select application hosting, PostgreSQL, object storage, Redis/BullMQ, and session store. Record region, HA, encryption, backup, restore, data-residency evidence, and processor agreements.
- [ ] **P0-05** Define data classification, threat model, RPO/RTO, availability targets, incident response, audit access, and production release approvers.
- [ ] **P0-06** Approve API authentication model, role/permission matrix, and single-tenant organization scoping rules.

**Phase gate:** signed decision record exists; no production resources or real data are provisioned before approval.

## P1 - Engineering Baseline

- [ ] **P1-01** Add unit/API/database/e2e test tooling and standard test commands.
- [ ] **P1-02** Add CI gates for typecheck, lint, tests, build, migrations, and dependency/security scanning.
- [ ] **P1-03** Define shared request/response schemas, error format, request correlation IDs, and API versioning policy.
- [ ] **P1-04** Define structured logging, secret redaction, PII masking, metrics, and tracing conventions.
- [ ] **P1-05** Add validated environment configuration; separate synthetic demo data from production configuration.
- [ ] **P1-06** Add architecture decision records for approved providers and deployment topology.

**Phase gate:** CI is green and blocks merge when required checks fail.

## P2 - PostgreSQL Schema and Migration

- [ ] **P2-01** Model normalized organizations, users, roles, permissions, sessions, and membership/scope data.
- [ ] **P2-02** Model accounts, accounting periods, journals, journal lines, reversals, vendors, invoices, payments, receipts, and idempotency keys.
- [ ] **P2-03** Model employees, PII, attendance, leave requests, payroll runs, policy versions, calculations, approvals, and remittances.
- [ ] **P2-04** Model audit logs and transactional outbox jobs with retention metadata.
- [ ] **P2-05** Add foreign keys, check constraints, unique indexes, tenant scoping, and indexes for report/query patterns.
- [ ] **P2-06** Add migration up/down checks, seed fixtures using synthetic identities, and data import/reconciliation tooling.
- [ ] **P2-07** Trace the `$11,120` discrepancy to source evidence, correct the erroneous/missing opening position, and load reconciled balances as balanced journal lines. Do not plug the difference to equity/suspense without documented source and approval.
- [ ] **P2-08** Validate encrypted backup and staging restore against the chosen database provider.

**Phase gate:** schema constraints, migration rollback, opening reconciliation, and restore tests pass.

## P3 - Identity, Session, and Authorization

- [ ] **P3-01** Implement sign-in, secure opaque session issuance, server-side session storage, expiry, rotation, revocation, and logout.
- [ ] **P3-02** Set Secure, HttpOnly, SameSite cookies; add CSRF protections and origin checks for state-changing browser requests.
- [ ] **P3-03** Remove browser persona switching and `localStorage` as a source of production identity/permission state.
- [ ] **P3-04** Add deny-by-default Express auth/RBAC middleware for protected endpoints.
- [ ] **P3-05** Enforce authorization and organization scope again inside domain services for sensitive mutations.
- [ ] **P3-06** Add role matrix, direct API bypass, revoked session, CSRF, and cross-scope denial tests.

**Phase gate:** no client-side manipulation or direct API call bypasses authorization.

## P4 - Ledger and Financial Workflows

- [ ] **P4-01** Make posted journal lines the sole financial source of truth; remove mutable account balances as an independent balance store.
- [ ] **P4-02** Implement report aggregation for trial balance, balance sheet, P&L, AP/AR aging, and date/period filters.
- [ ] **P4-03** Validate active account, account existence, positive decimal inputs, entry line rules, and debit/credit equality before posting.
- [ ] **P4-04** Enforce open-period date rules and prevent modification of posted entries.
- [ ] **P4-05** Implement journal reversal/adjustment with reason, original-entry reference, actor, and audit event.
- [ ] **P4-06** Add invoice, payment, and receipt finite-state transitions and unique idempotency/external references.
- [ ] **P4-07** Make each posting/payment a database transaction; test rollback and concurrent duplicate submission.
- [ ] **P4-08** Reconcile AP/AR source records and control-account balances; reject illegal state transitions and double payment.

**Phase gate:** every report reconciles and all financial idempotency/invariant tests pass.

## P5 - Nigerian Payroll and Statutory Rules

- [ ] **P5-01** Implement versioned, effective-dated statutory policy configuration from the P0 signed rule specification.
- [ ] **P5-02** Model gross compensation components and pensionable earnings explicitly; calculate employee and employer obligations separately.
- [ ] **P5-03** Implement approved CRA/PIT, NHF, ITF, NSITF, pension, exemption, eligibility, rounding, and remittance rules.
- [ ] **P5-04** Persist input snapshot, policy version, line-by-line calculation, approvals, status, remittance data, and GL references per payroll run.
- [ ] **P5-05** Create signed golden test cases for ordinary, boundary, exempt, opted-in/out, changed-rate, retroactive, and rounding scenarios.
- [ ] **P5-06** Add controls for payroll approval separation of duties and restricted banking/PII access.

**Phase gate:** payroll/tax reviewers approve formula tests and payroll-to-GL reconciliation.

## P6 - ACID Transactions, Outbox, and Background Work

- [ ] **P6-01** Write payroll state and outbox event in the same database transaction.
- [ ] **P6-02** Implement outbox relay to BullMQ/Redis with idempotent consumer handling and job correlation IDs.
- [ ] **P6-03** Configure exponential retry/backoff, jitter, timeout, dead-letter queue, alerting, replay, and reconciliation workflow.
- [ ] **P6-04** Mark payroll final only after its balanced GL accrual is durably committed; represent pending/failed/recoverable states.
- [ ] **P6-05** Configure Redis region, TLS/network policy, persistence/HA, credential rotation, and queue health checks.
- [ ] **P6-06** Test worker crash, duplicate event, retry exhaustion, database rollback, and exactly-one financial effect.

**Phase gate:** payroll-to-GL remains recoverable and produces no duplicate or orphan postings.

## P7 - Audit, PII, Retention, and Documents

- [ ] **P7-01** Write append-only server-side audit records with actor, timestamp, action, target, correlation ID, and minimized before/after data.
- [ ] **P7-02** Restrict audit update/delete at database privilege level; document integrity guarantees without unsupported cryptographic claims.
- [ ] **P7-03** Encrypt PII at rest with managed keys; restrict decryption paths and mask bank/government identifiers in UI, APIs, logs, and support tools.
- [ ] **P7-04** Add private object storage, upload MIME/size validation, malware scanning, encryption, and retention metadata.
- [ ] **P7-05** Issue authorization-checked signed download URLs with maximum 15-minute expiry; verify expiry and access denial in tests.
- [ ] **P7-06** Implement NDPA data-subject request workflow with legal hold, pseudonymization, archival lock, and minimization of retained identifiers.
- [ ] **P7-07** Enforce approved seven-year record schedule by category and implement auditable disposition after retention expires.
- [ ] **P7-08** Verify object/database backup coverage and run restore/access-control exercises.

**Phase gate:** privacy/security review passes; retention and legal hold workflows are auditable.

## P8 - Provider Health and AI Guardrails

- [ ] **P8-01** Align provider option values, types, and factory keys; reject unsupported configuration at API boundary.
- [ ] **P8-02** Persist configuration server-side and gate changes by role; validate provider before switching.
- [ ] **P8-03** Implement bounded database/storage/Redis round-trip health checks with accurate healthy/degraded/down states.
- [ ] **P8-04** Protect AI endpoints with authentication, authorization, payload limits, rate limiting, provider allowlist, timeout, and managed secrets.
- [ ] **P8-05** Add strict JSON schema validation and Decimal.js verification for amounts, tax, line sums, and invoice totals.
- [ ] **P8-06** Add field-level confidence/provenance; block submission below 90% confidence until required human verification is recorded.
- [ ] **P8-07** Implement one initial AI attempt plus at most three retries with exponential backoff/jitter, circuit breaker, cooldown, and half-open checks.
- [ ] **P8-08** Route circuit-open, timeout, rate-limit, and malformed-response cases to manual voucher entry; remove fabricated success fallbacks.
- [ ] **P8-09** Test that no AI output posts directly to the GL and no failed extraction appears as verified success.

**Phase gate:** AI/provider failure behavior is explicit, bounded, observable, and financially safe.

## P9 - API-Driven UI and Real-Time Updates

- [ ] **P9-01** Replace direct client-side business engines with authenticated API reads and mutations.
- [ ] **P9-02** Add loading skeletons, empty states, inline validation, permission-denied views, conflict handling, and service-failure states.
- [ ] **P9-03** Lazy-load accounting, HRM, receipt, invoice, and chart views; define and measure bundle/performance budgets.
- [ ] **P9-04** Add authorized SSE endpoints for executive dashboard metrics and active HR clock-in changes only.
- [ ] **P9-05** Add event IDs/versions, heartbeat, reconnect, last-updated state, authoritative refetch, and bounded polling fallback.
- [ ] **P9-06** Ensure ledger totals are server-authoritative; never present optimistic values as confirmed balances.
- [ ] **P9-07** Test disconnect/reconnect, missed-event recovery, concurrent updates, role restrictions, and mobile workflows.

**Phase gate:** real-time features recover without stale balances and all other views remain API-driven.

## P10 - Deployment and Operations

- [ ] **P10-01** Create isolated development, staging, and production environments in approved accounts/regions.
- [ ] **P10-02** Configure managed encrypted secrets, TLS-only database connections, private networking, least-privilege service identities, and credential rotation.
- [ ] **P10-03** Add liveness/readiness probes, structured logs, metrics, traces, error reporting, and alerts for ledger mismatch, failed jobs, and stale SSE.
- [ ] **P10-04** Schedule daily encrypted database backups and required object versioning/backup; document RPO/RTO.
- [ ] **P10-05** Automate scheduled staging restore verification and retain evidence of restore success.
- [ ] **P10-06** Complete threat model, security review, dependency/container scanning, penetration test, privacy review, and operational runbooks.
- [ ] **P10-07** Run synthetic-data staging acceptance and controlled pilot; monitor reconciliation, job failures, auth denials, and AI fallbacks.
- [ ] **P10-08** Obtain Finance, HR, Security, Operations, and legal/compliance sign-off before enabling live transactions.

**Phase gate:** production launch checklist is approved and recovery has been rehearsed.

## Definition of Done

A task is complete only when implementation, automated tests, review, and required evidence are present. A phase is complete only when its plan exit gate is met. Production launch remains blocked until P0, P4-P8, and P10 gates have written approvals and all release acceptance criteria in the plan pass.
