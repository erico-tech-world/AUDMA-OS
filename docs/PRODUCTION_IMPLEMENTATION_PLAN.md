# AUDMA OS Production Implementation Plan

**Status:** In progress; local validation, PostgreSQL schema baseline, and AI resilience implemented, production gates blocked  
**Scope:** Single-tenant production deployment for AUDMA Integrated Services Ltd  
**Progress tracker:** [PRODUCTION_IMPLEMENTATION_TASKS.md](./PRODUCTION_IMPLEMENTATION_TASKS.md)

## 1. Objective

Evolve the current React/Express demonstration into a secure, auditable, durable enterprise system for Nigerian financial and workforce workflows. Keep the modular-monolith deployment model initially; introduce external services only where the requirements need them. Do not process live payroll, employee PII, or financial transactions until the release gates in this plan pass.

## 2. Decisions and Mandatory Validation Gates

### Hosting and data residency

- **Proposed default for evaluation:** AWS in `af-south-1`, with application services, Multi-AZ RDS PostgreSQL, private S3, and managed Redis in the same selected region where available.
- **Important:** Cape Town is outside Nigeria. It is not Nigerian data residency and does not by itself establish NDPA compliance. If the organization requires data to remain physically in Nigeria, use a verified Lagos provider/data center instead. Obtain legal review of cross-border transfer mechanisms, subprocessors, support access, backups, disaster-recovery locations, and contracts before selecting a region.
- Treat Neon and Cloudflare R2 as alternatives only after verifying exact service-region availability, data-location behavior, backups/replicas, contractual terms, and compliance fit. Do not assume a bucket policy guarantees data residency.
- **Decision gate:** Record the approved provider/region and evidence before creating production resources or handling production data.

### Statutory calculations and retention

- The supplied CRA, PIT, pension, NHF, ITF, and NSITF rules are implementation inputs for review, not yet an approved legal specification. Obtain Nigerian tax/payroll counsel and accounting sign-off for applicable statutes, effective dates, eligibility thresholds, calculation bases, rounding, caps, exemptions, remittance deadlines, and employer liabilities.
- Implement approved rates as versioned, effective-dated policy data. Preserve the exact ruleset/version used for each payroll run so historical calculations can be reproduced.
- Treat the proposed seven-year financial/payroll retention period as a policy requiring legal confirmation by record category, start date, exceptions, and legal holds. Apply data minimization and restricted archival access when active HR PII is no longer required.
- Define pseudonymization/cryptographic-erasure procedures that preserve legally required ledger and remittance evidence without retaining unnecessary active-directory PII. Audit snapshots must not become a second uncontrolled PII store.

### Core technology choices

- **Database:** Prefer managed PostgreSQL with Multi-AZ failover in the approved region (proposed AWS RDS). Neon is a conditional alternative only if its chosen region and operational guarantees satisfy the approved residency assessment.
- **Object storage:** Prefer private regional S3 with SSE-KMS and short-lived signed URLs. R2 or MinIO requires the same location, access-control, encryption, and contract validation.
- **Jobs and sessions:** Managed Redis in the approved region for BullMQ and opaque server-side sessions; isolate namespaces/credentials and define persistence/failover behavior.
- **Application:** Keep the Express API and React SPA as a modular monolith. All business data and mutations move behind authenticated APIs.
- **Real time:** Use SSE for executive dashboard metrics and HR clock-in changes only. Send versioned events; reconnect by refetching authoritative data and use bounded polling as fallback. Never use optimistic client values as authoritative ledger balances.
- **AI:** Use server-side provider adapters with timeouts, rate limits, strict schema validation, circuit breaking, and mandatory human review before financial submission.

## 3. Target Architecture

1. Browser SPA authenticates through an HTTP-only, Secure, SameSite cookie session.
2. Express middleware validates session, CSRF protection, role/permission, organization scope, input schema, and request limits.
3. Domain services execute accounting, HRM, payroll, invoice, and receipt rules; repositories persist to PostgreSQL.
4. ACID transactions write business state, journal entries, audit events, and outbox records as required.
5. An outbox relay publishes durable jobs to BullMQ/Redis. Idempotent workers process jobs with exponential backoff and dead-letter visibility.
6. Private object storage keeps source documents; API authorization issues signed download URLs with a maximum 15-minute lifetime.
7. SSE exposes only the approved dashboard/attendance event types, with authorization, heartbeat, reconnection, and polling fallback.
8. Structured logs, metrics, traces, alerts, backups, restore drills, and readiness/liveness checks support operations.

## 4. Phased Implementation

### Phase 0 - Compliance and architecture decisions

- Confirm Nigerian data protection/cross-border transfer assessment, selected region, processor agreements, and any local-residency requirement.
- Validate statutory payroll formulas and retention rules with qualified Nigerian legal/accounting reviewers.
- Define threat model, data classification, RPO/RTO, availability targets, audit access, and disaster recovery.
- Approve provider choices and environment segregation; do not provision production infrastructure before approval.

**Exit gate:** signed decision record for residency, hosting, statutes, retention, providers, and security requirements.

### Phase 1 - Engineering baseline

- Add test runner, API/integration/e2e test structure, linting, migrations workflow, CI, dependency scanning, and secure configuration validation.
- Define error contracts, request correlation IDs, typed API schemas, logging redaction, and database transaction conventions.
- Add feature flags and explicitly separate demo fixtures from production configuration.

**Exit gate:** CI blocks merge on typecheck, lint, tests, build, and migration validation; no secrets are required in source control.

### Phase 2 - PostgreSQL schema and data migration

- Design normalized tables for organizations, users, roles, permissions, sessions, accounts, journals, journal lines, vendors, invoices, payments, receipts, employees, attendance, leave, payroll, audit logs, idempotency keys, and outbox jobs.
- Add primary/foreign keys, check constraints, unique constraints, tenant scoping, indexes, and database-level protections for posted journal immutability.
- Create reversible, versioned migrations and synthetic seed data. Inventory existing demo records; do not import demo identities or balances as live records.
- Trace the `$11,120` opening discrepancy to source evidence and determine which opening account balance or omitted activity is wrong. A balanced journal alone cannot change the aggregate debit/credit difference; do not invent a retained-earnings or suspense plug. Load reconciled opening positions as balanced journal lines, then verify the trial balance and balance sheet before enabling transactions.

**Exit gate:** migrations, rollback, constraints, reconciliation, and backup/restore work in staging.

### Phase 3 - Identity, sessions, and authorization

- Implement authentication and opaque, revocable server-side sessions stored in Redis; use secure cookie flags, CSRF protection, expiration, rotation, and logout revocation.
- Remove production role/persona switching and browser-persisted permission authority.
- Add Express middleware plus domain-service authorization for every protected read/write; scope all records to the single organization.
- Add role/permission matrix tests, session theft/revocation tests, and deny-by-default API tests.

**Exit gate:** changing browser state or calling APIs directly cannot bypass authorization.

### Phase 4 - Accounting ledger and workflow state machines

- Remove mutable account balance fields as a source of truth. Derive reports from posted journal lines with date and period filters.
- Validate account active/existence, positive finite decimals, balanced debit/credit totals, immutable transaction dates, and open accounting periods before posting.
- Implement explicit invoice, payment, receipt, and journal state transitions with unique idempotency/reference constraints.
- Enforce reversal/adjustment-only correction for posted journals; retain actor, reason, source, and links to corrected entries.
- Derive AP/AR control balances from source ledgers and reconcile reports.

**Exit gate:** property/unit tests prove ledger invariants; retries, invalid transitions, closed periods, and inactive accounts are rejected without partial writes.

### Phase 5 - Nigerian payroll engine

- Implement an effective-dated statutory ruleset only after Phase 0 legal approval. Keep rules configurable/versioned rather than embedding rates in UI or domain code.
- Model gross pay components, pensionable earnings, employee/employer pension contributions, approved reliefs and PIT bands, NHF eligibility/opt-in, ITF threshold/basis, NSITF, rounding, and remittances as separately testable calculations.
- Persist inputs, policy version, calculation breakdown, approvals, payment state, and statutory liabilities for every payroll run.
- Add sample cases approved by payroll/tax reviewers; include boundary, eligibility, rounding, mid-period change, and retroactive correction tests.

**Exit gate:** signed golden test cases and reconciled payroll-to-GL schedules for the approved Nigerian ruleset.

### Phase 6 - ACID posting, outbox, and durable jobs

- Execute invoice, payment, receipt approval, journal posting, and payroll state changes in database transactions.
- Write outbox records in the same transaction as business state; relay them to BullMQ/Redis with idempotent consumers, bounded exponential retries, dead-letter handling, replay, and reconciliation views.
- Mark payroll final only when the balanced GL accrual is durably committed; expose recoverable pending/failed states.
- Configure Redis availability, persistence, network restrictions, credential rotation, and queue monitoring.

**Exit gate:** integration tests cover rollback, concurrent duplicate requests, worker crashes, retries, and one financial effect per idempotency key.

### Phase 7 - Audit, privacy, and document lifecycle

- Persist append-only audit events with actor, timestamp, action, target, correlation ID, and minimized before/after snapshots. Restrict database/application roles from updating or deleting audit entries.
- Encrypt sensitive PII at rest with managed keys; mask bank and government identifiers in responses/logs and use least-privilege decryption.
- Store documents in private, approved-region object storage with encryption, malware/type/size checks, retention metadata, and signed URLs expiring within 15 minutes.
- Implement data-subject-request workflow: classify data, apply legal hold/retention, pseudonymize active HR identity where allowed, retain only required statutory records, and record the decision.
- Enforce approved seven-year retention policy by record class, with legal holds and auditable disposition.

**Exit gate:** security review confirms access controls, redaction, expiry, retention, and restore behavior; no public object URLs or uncontrolled PII snapshots.

### Phase 8 - Provider health and AI resilience

- Correct provider identifiers and validate provider configuration server-side; do not present mock health data as live connectivity.
- Add bounded authenticated round-trip checks for database, object store, and Redis, including degraded/unavailable outcomes.
- Protect AI endpoints with authentication, role checks, payload limits, rate limits, provider allowlists, secret management, and timeouts.
- Validate responses using strict runtime schemas and Decimal.js total checks; retain field-level confidence/provenance and raw outputs only under approved privacy policy.
- Configure one initial attempt plus at most three retries with exponential backoff/jitter, then open circuit breaker and present manual voucher entry. Define half-open probes and avoid retrying permanent validation errors.
- Require human verification for every extraction; below 90% confidence requires prominent mandatory field-level verification and cannot be submitted until reviewed.

**Exit gate:** provider failures, timeouts, malformed output, low confidence, and circuit-open behavior never create or post a financial record.

### Phase 9 - API-driven frontend and limited real time

- Replace client-side business engines/local mock persistence with typed authenticated API queries and mutations.
- Add loading skeletons, empty states, inline validation, permission failures, conflict/retry handling, and explicit service error notices.
- Lazy-load major views/charts; measure bundle size and first-load performance against agreed budgets.
- Add authorized SSE channels for dashboard metrics and active clock-in updates only; include event IDs/versions, heartbeat, reconnect, authoritative refetch, and polling fallback.
- Treat ledger values as server-authoritative; display last-updated/synchronization state and never show optimistic balances as confirmed.

**Exit gate:** end-to-end tests prove refresh/reconnect/concurrent update behavior and non-real-time views do not create unnecessary streaming connections.

### Phase 10 - Release, operations, and compliance evidence

- Separate development/staging/production accounts and credentials; store secrets in a managed secret manager and rotate them.
- Deploy only to the approved region; configure TLS, network restrictions, readiness/liveness probes, structured logs, metrics, tracing, and alerts.
- Automate daily encrypted database backups and required object-store backup/versioning; run scheduled restore tests into staging and document RPO/RTO evidence.
- Conduct threat modeling, dependency/container scanning, penetration testing, privacy review, payroll/accounting sign-off, and disaster-recovery exercise.
- Roll out with synthetic data first, then controlled pilot; monitor ledger reconciliation, job dead letters, SSE freshness, auth denials, and AI fallback rates.

**Exit gate:** written Finance, HR, Security, Operations, and legal/compliance approval before any live payroll or financial posting.

## 5. Release Acceptance Criteria

- Trial balance and balance sheet reconcile for every approved report date and accounting period.
- Journal entries are immutable after posting; reversals are linked and auditable.
- Duplicate API requests, queue redeliveries, or concurrent approvals cannot duplicate payments or postings.
- Payroll uses an approved, versioned Nigerian ruleset and has exactly one reconciled GL accrual per finalized run.
- Server-side authentication/authorization and organization scoping pass direct API tests.
- PII is masked in logs, protected at rest, and accessible only by authorized workflows.
- Private document links expire within 15 minutes; retention and legal holds are auditable.
- Provider health is real; failed AI does not generate success-shaped financial records.
- SSE clients recover using authoritative refetch/polling and do not report stale ledger balances as current.
- CI, restore drills, security reviews, statutory sign-off, and operational alerts are all passing.

## 6. Progress and Change Control

Track task-level status, owner, blockers, evidence, and completion date in [PRODUCTION_IMPLEMENTATION_TASKS.md](./PRODUCTION_IMPLEMENTATION_TASKS.md). A task is complete only when its acceptance evidence is linked or recorded. Compliance formulas, region/provider selection, and retention policy require documented approval; implementation must not silently convert an assumption into policy.
