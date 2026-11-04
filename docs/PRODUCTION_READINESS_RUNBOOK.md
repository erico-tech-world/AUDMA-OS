# AUDMA OS Production Readiness Runbook

**Purpose:** Practical implementation path from the current local validation slice to a controlled production release.

**Current state:** Unit tests, type-check, build, local financial guards, AI payload validation, and process-local AI resilience exist. PostgreSQL, `pg`, `node-pg-migrate`, PGlite migration tests, a PostgreSQL schema baseline, and local Compose/container files have now been added. Business workflows still use in-memory engines; no approved production database, server-side login integration, accounting source reconciliation, or deployment environment exists. Do not enter live employee, payroll, or financial data until the relevant gates below pass.

**Important:** This runbook is an engineering guide, not Nigerian legal, tax, privacy, or accounting advice. Qualified reviewers must approve those decisions in writing.

## 1. Open-Source Reference Stack

This stack avoids proprietary managed application platforms and can run on organization-controlled infrastructure. Open-source software does not make the physical data center, ISP, hardware, or hosting contract open source; those still need procurement and residency review.

| Concern | Suggested software | Use |
| --- | --- | --- |
| Web/API | Existing React, Express, TypeScript, Node.js | Keep the modular monolith; deploy one API and static UI artifact initially. |
| Database | PostgreSQL 17 | Durable workflow and ledger source of truth. The repo now has a local Compose service and initial schema migration. |
| Database adapter | `pg` | Node PostgreSQL connection pool; business-domain repositories still need implementation. |
| Migrations | `node-pg-migrate` with reversible SQL migrations | Versioned up/down changes; CI runs up/down/up against PostgreSQL. |
| Migration unit tests | PGlite | Executes schema constraints and rollback tests without a local PostgreSQL daemon; CI remains authoritative against PostgreSQL 17. |
| Identity | Keycloak (OIDC) | Login, MFA, user lifecycle, and identity federation; AUDMA still enforces its own permissions. |
| App sessions/cache | Valkey plus `express-session` with a compatible store, or PostgreSQL-backed sessions | Revoke server-side sessions; do not trust localStorage for identity. Select one approved store. |
| Object storage | SeaweedFS S3 gateway or Ceph RGW | Private invoice/receipt/document storage. Require encryption, private buckets, access checks, and tested restore. |
| Secrets | OpenBao | Runtime secret delivery, access policies, audit, and rotation. SOPS + age can encrypt non-runtime deployment configuration. |
| Infrastructure as code | OpenTofu | Reproducible environment provisioning where the target infrastructure has a supported provider. |
| Configuration management | Ansible | Harden Linux hosts, deploy services, configure backups, and perform repeatable operations. |
| Edge/TLS | Caddy or Traefik | Reverse proxy, TLS termination, request limits, and security headers. Public certificate issuance still relies on a certificate authority. |
| CI | Forgejo + Forgejo Actions runner | The repository workflow is `.forgejo/workflows/ci.yaml`; host Forgejo and its runner on organization-controlled infrastructure. |
| Observability | OpenTelemetry, Prometheus, Alertmanager, Grafana, Loki | Traces, metrics, logs, dashboards, and alerts. Keep PII and secrets out of telemetry. |
| Security checks | Trivy, OWASP ZAP, OSV-Scanner | Container/dependency scans and authorized DAST. Review findings; scanners are not a security approval. |
| Browser tests | Playwright | Authenticated workflow, access-control, and mobile UI regression tests. |
| Load tests | k6 | Capacity and latency tests using synthetic data and an isolated staging environment. |
| Backup | `pgBackRest` plus object-store versioning/replication | Encrypted PostgreSQL backups and documented restore drills. |

For a strict open-source deployment, use company-owned hardware or an approved private infrastructure running OpenStack. A commercial cloud may run open-source software, but its control plane, contracts, regions, support access, and subprocessors remain a provider decision. Do not use external Gemini/OpenAI/Groq endpoints under a strict no-proprietary-service policy. Prefer local OCR such as Tesseract and, only after model-license review, a local inference runtime such as llama.cpp or Ollama. “Open weights” is not automatically the same as an OSI-approved open-source license.

Pin versions and review each component's current license, maintenance status, security policy, and transitive dependencies before adoption. Do not treat this suggested stack as an approved residency decision.

## 2. Gates and Owners

Create a decision/evidence record for every gate. The accountable business reviewer signs; engineering records the implementation and verification. Never check a task complete because a service starts or a test passes when its acceptance evidence requires legal or operational approval.

| Gate | Required accountable input | Engineering evidence before exit |
| --- | --- | --- |
| P0 Legal/privacy/residency | Counsel/privacy lead decision on Nigeria-only vs approved transfer, statutory rules, retention, subprocessors, and record classes | Signed decision record, data-flow map, approved provider/region, retention schedule, and payroll/accounting rule specification. |
| P0 Security/operations | Security and Operations approval of threat model, RPO/RTO, availability, incident handling, release authority | Threat model, risk register, recovery objectives, incident runbook, and access policy. |
| P2 Data/schema | Finance owner supplies approved chart of accounts, periods, relationships, and migration scope | Reviewed migrations, constraints, rollback test, synthetic seeds, and repository/backup validation. |
| P2 Opening balances | Finance owner supplies dated trial balance and source schedules | Signed reconciliation workbook, balanced opening journals, and independently checked reports. |
| P3 Identity | Organization approves login/MFA, role matrix, invite/deactivation, and emergency-admin process | OIDC/session configuration, deny-by-default API tests, CSRF/origin tests, scope tests, and revocation evidence. |
| P4 Ledger | Finance approves posting, period close, reversal, and approval rules | Transaction/idempotency/concurrency tests; ledger-derived reports reconcile to approved schedules. |
| P8 Providers/AI | Security/privacy owner approves permitted inference location, model licenses, and AI data handling | Route-level tests, schema/decimal checks, timeouts, shared rate limits, breaker tests, manual review workflow, and monitored health checks. |
| P10 Release | Finance, HR, Security, Operations, and legal/compliance sign-off | Staging acceptance, restore evidence, incident/rollback drills, security review, and signed release checklist. |

## 3. Phase-by-Phase Execution

### Phase A: P0 decisions before provisioning

1. Appoint named owners for Finance, HR/payroll, Legal/Privacy, Security, and Operations. Record a target date and evidence location in the task tracker.
2. Decide the residency requirement in plain language: strictly inside Nigeria, or cross-border processing under a counsel-approved mechanism. Include primary data, backups, logs, support access, subprocessors, and disaster recovery.
3. Have Nigerian legal/accounting reviewers approve applicable statutes, effective dates, tax bases, eligibility, exceptions, rounding, remittance deadlines, and payroll golden cases. Do not infer current tax policy from demo constants.
4. Approve a retention matrix by record class, legal holds, data-subject request handling, and deletion/pseudonymization authority.
5. Approve classification, threat model, RPO/RTO, uptime objective, incident contacts, audit access, and production release authority.
6. Record decisions in an ADR/decision log with reviewer, date, source evidence, scope, and reconsideration trigger. Provision no production infrastructure until signed.

### Phase B: P2 schema and opening reconciliation

1. Inventory existing in-memory models and label every record as demo/synthetic. Do not migrate sample people, balances, or invoices as real records.
2. Finance provides the source trial balance, opening date, bank reconciliation, AP/AR subledgers, fixed-asset schedule, payroll liabilities, and journals supporting the opening position. Use redacted samples in development.
3. Trace the documented `$11,120` mismatch to the source records. Identify a specific missing/incorrect balance or transaction and obtain reviewer sign-off. Never plug it to equity or suspense without documented source and approval.
4. Design normalized tables for organization, users/memberships, accounts, periods, journal headers/lines, invoices, payments, receipts, HR, payroll, audit events, idempotency keys, and outbox events.
5. Add foreign keys, uniqueness, tenant scoping, amount/date/state checks, and posted-journal immutability constraints. Use `NUMERIC`/decimal strings for money, never binary floating point.
6. Create versioned up/down migrations and deterministic synthetic seeds. Verify a blank database can migrate up, seed, migrate down where supported, and migrate up again in CI.
7. Import only reconciled opening positions as balanced journal lines in one reviewed transaction. Rebuild trial balance, balance sheet, P&L, AP/AR controls, and bank totals from journal lines and compare with signed schedules.
8. Exit only after Finance signs the reconciliation and migration/rollback tests pass. If source evidence is missing, stop here; the software cannot establish the correct opening balances.

### Phase C: P3 identity, sessions, and RBAC

1. Run Keycloak in a separate development/staging environment first. Create separate realms/clients per environment, OIDC authorization-code flow with PKCE, MFA policy, redirect allowlist, and account recovery/deactivation procedure.
2. Define a server-owned mapping from OIDC subject to AUDMA organization membership and permissions. Ignore roles/permissions supplied by the browser; never derive authorization from localStorage, query strings, or persona selection.
3. Issue an opaque application session in a server-side store. Set `Secure`, `HttpOnly`, and appropriate `SameSite` cookies; rotate on login/privilege change; expire and revoke on logout/deactivation. Protect state changes with CSRF tokens and origin checks.
4. Add deny-by-default Express middleware and permission checks in domain services for every sensitive read/write. Scope every data query to the organization membership from the server session.
5. Hide or remove persona switching from production builds. Keep a separate development-only fixture mode that cannot run in production.
6. Test unauthenticated requests, each role/permission, direct API bypass, changed browser state, CSRF, wrong organization, expired/revoked sessions, and account deactivation. Do not use default or shared passwords.

### Phase D: P4 durable ledger and workflow controls

1. Make posted journal lines the source of truth. Treat any cached account balance as a rebuildable projection and reconcile it against journal aggregation.
2. Model accounting periods with explicit open/closed state. Posting must atomically verify period-open, account-active, date, exact decimal amount, minimum lines, and equal debit/credit totals.
3. Perform posting and state changes in PostgreSQL transactions. Use unique idempotency keys and external references; lock/serialize the records whose state is being approved or paid to stop concurrent duplicates.
4. Make posted journals immutable. Correct them only through a linked reversal/adjustment carrying actor, reason, source reference, and audit event.
5. Represent invoices, payments, receipts, leave, and payroll as explicit state machines; enforce transitions in domain services and database constraints, not only in UI controls.
6. Add transactional outbox rows in the same transaction as work requiring background jobs. Make consumers idempotent and observable; define retries, dead-letter handling, replay, and reconciliation.
7. Test rollback after each failure point, duplicate/replayed requests, concurrent approvals, closed periods, inactive accounts, reversal lineage, and report reconciliation.

### Phase E: P8 provider, AI, and manual review

1. For strict open-source operation, disable external commercial AI providers. Select and license-review a local OCR/model stack; verify that model weights and usage terms meet the organization's definition of open source.
2. Put provider credentials/configuration in OpenBao. Do not store secrets in `.env.example`, source control, client bundles, logs, or provider settings in localStorage. Fail startup on missing/placeholder production config.
3. Require authenticated role checks, schema-validated input, content-type checks, image/PDF type and size checks, request timeout, and shared rate limits at the edge and API. Current rate limiting is process-local and must be replaced by shared Valkey/edge state before multi-instance production.
4. Use bounded retries only for transient network, timeout, 408, 429, or 5xx failures; do not retry invalid input or malformed output. Apply exponential backoff with jitter, a provider circuit breaker with cooldown and one half-open probe, and a manual-entry response when unavailable.
5. Validate responses against strict runtime schemas (for example, Zod or Ajv). Parse amounts with Decimal.js; verify line totals, tax, subtotal, total, dates, currency, and permitted account codes. Reject malformed results rather than repairing them silently.
6. Store field provenance/confidence only if approved by privacy policy. Require an explicit reviewer confirmation before creating a voucher; no AI output posts directly to the GL.
7. Add route-level tests with injected/fake provider transports for malformed JSON, missing credentials, timeout, 429/5xx, permanent 4xx, retry exhaustion, open circuit, rate limit, bad totals, and successful human-reviewed output.
8. Do not show mock provider health as live health. Probe each configured service with a bounded authenticated check and report healthy/degraded/down with observation time.

### Phase F: P10 open-source deployment and operations

1. After P0 selects location and architecture, decide whether organization-controlled hardware/OpenStack is feasible. Obtain procurement approval for hardware, facility, network, power, physical access, and disaster-recovery location.
2. Use OpenTofu and Ansible to create reproducible development, staging, and production environments. Keep network boundaries, OS patch policy, service accounts, firewall rules, and secret scopes separate.
3. Deploy the app behind Caddy/Traefik with TLS, secure headers, bounded request sizes, health endpoints, and restricted admin paths. Do not expose PostgreSQL, Valkey, Keycloak admin, object-store admin, or OpenBao publicly.
4. Deploy PostgreSQL, Valkey, private S3-compatible storage, Keycloak, and OpenBao with encrypted volumes, network ACLs, least privilege, rotation, monitoring, and tested recovery. If high availability cannot be operated, document the risk and do not claim HA.
5. Set up OpenTelemetry/Prometheus/Grafana/Loki alerts for API errors, authentication denials, DB health, ledger reconciliation mismatch, backup age, queue backlog, provider failures, and circuit state. Redact PII and secrets at source.
6. Automate encrypted daily database backups and required object versioning. Perform a clean restore into isolated staging; record duration, integrity checks, RPO/RTO achieved, and approver. A successful backup command is not restore evidence.
7. Run dependency/container scans, authorized OWASP ZAP tests, Playwright workflows, k6 load tests with synthetic data, threat-model review, incident exercise, and rollback drill. Fix or formally accept risks before release.
8. Run a synthetic-data pilot first. Finance, HR, Security, Operations, and Legal/Privacy reviewers sign the release gate before live data or transactions are enabled.

## 4. What Can Be Automated Here

With requirements and non-secret access to the repository, engineering can implement migrations, API schemas, authorization middleware, session integration, transaction/repository code, route tests, deployment manifests, OpenTofu/Ansible modules, CI checks, backup scripts, dashboards, and restore-test automation.

Automation cannot make legal decisions, approve tax rules, choose a data-residency interpretation, identify the correct `$11,120` adjustment without source evidence, grant organization access, approve risk, or sign a release. No cloud/MCP provisioning credentials are currently connected to this workspace. Do not paste passwords, API keys, private keys, or recovery codes into chat. Use an approved secret manager and grant least-privilege, time-limited operator access through the actual infrastructure console or deployment runner.

## 5. Inputs Needed Before Automation

Provide decisions/evidence, not credentials:

- Residency requirement and written Legal/Privacy assessment; approved locations for primary data, backups, logs, support, and disaster recovery.
- Named approvers/owners for Legal/Privacy, Finance, HR/payroll, Security, and Operations; target dates and evidence repository.
- Signed payroll/accounting rules and retention schedule, including effective dates and test cases.
- Redacted source trial balance and supporting bank/AP/AR/fixed-asset/payroll schedules for the opening date; reconciliation owner and sign-off.
- Approved role/permission matrix, organization membership rules, MFA and emergency access policy.
- Approved environment topology, capacity/budget, RPO/RTO, DNS/domain ownership, certificate and incident contacts.
- Provider/model allowlist and license/privacy approval; whether all AI processing must remain local.
- Approval to use organization-controlled hardware/OpenStack or a named infrastructure provider. Provider access should be configured directly in the deployment system, never sent in chat.

After those inputs are approved, the first executable milestone should be a staging-only vertical slice: Keycloak login -> authenticated Express API -> PostgreSQL migration -> one journal transaction with idempotency -> audit/outbox write -> backup and isolated restore. Do not enable live payroll or financial posting until that slice passes the signed acceptance gates.