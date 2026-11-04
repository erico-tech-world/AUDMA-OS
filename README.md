# AUDMA OS - HRM & Accounting Prototype

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646cff.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8.svg)](https://tailwindcss.com/)
[![Express](https://img.shields.io/badge/Backend-Express%20v4-lightgrey.svg)](https://expressjs.com/)
[![Local AI](https://img.shields.io/badge/AI-Ollama%20local-111111.svg)](https://ollama.com/)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)]()

> **AUDMA OS** is a React/Express prototype for exploring general-ledger, workforce, invoice, and receipt workflows with demo RBAC personas and pluggable provider interfaces.

> **Implementation status:** This repository is a prototype, not an enterprise production system. The UI contains demo personas and in-memory business engines; provider cards and several adapters are illustrative. PostgreSQL migrations and connectivity checks now exist, but accounting, HR, and payroll workflows are not yet persisted through them. There is no production login/RBAC enforcement, approved compliance policy, or production deployment. See [the production readiness runbook](docs/PRODUCTION_READINESS_RUNBOOK.md) and tracker before using real data.

---

## 🌟 Executive Summary & Key Highlights

AUDMA OS addresses modern enterprise fragmentation by unifying accounting and human capital domains in a high-performance, single-instance architecture:

1. **Deterministic Double-Entry Financial Engine**:
   - Zero-floating-point financial calculations powered by **Decimal.js** (20-digit precision).
   - Strict debit/credit invariance: no out-of-balance journal entries can be committed.
   - Comprehensive Chart of Accounts (Assets, Liabilities, Equity, Revenue, COGS, Expenses).
   - Real-time Balance Sheet, Income Statement (P&L), Trial Balance, General Ledger, and Aging Schedules.

2. **Decoupled Cross-Domain Event Architecture**:
   - Asynchronous Event Bus connecting HRM, Payroll, Receipts, and General Ledger.
   - Finalizing payroll automatically synthesizes balanced double-entry journals (`hrm.payroll.finalized` &rarr; gross salaries debited, net pay/tax/pension liabilities credited).

3. **Intelligent AP/AR Invoice & Receipt Tracker**:
   - Server-routed invoice and receipt extraction with Ollama as the default local provider; external providers require explicit selection and credentials.
   - Instant visual clarity & confidence scoring with automated warning heuristics for blurred/corrupted documents.
   - Automated mapping of line items and expenses to GL account codes (e.g., fuel to `5250`, meals to `5350`, cloud to `5200`).
   - Prompt-driven natural language outbound invoice generator for instant billing.

4. **Human Resource & Workforce Management (HRM)**:
   - Full employee directory lifecycle (Engineering, Finance, Executive, Operations, Marketing, HR).
   - Department hierarchical structure, manager assignment, and headcount tracking.
   - Leave administration and approval workflows with status badges.
   - Time & Attendance tracking with smart geolocation/IP simulation, overtime calculation, and duplicate clock-in guardrails.
   - Automated multi-tier statutory payroll processing (tax withholding, pension matching, net disbursements).

5. **Pluggable Provider Architecture & High Availability**:
   - **Database**: In-Memory (Local/Dev), Neon Serverless Postgres, Supabase Postgres, Local PostgreSQL.
   - **Object Storage**: Local Base64/Disk, Cloudflare R2, Supabase Storage, MinIO S3.
   - **AI/LLM Engine**: Ollama is the default local endpoint; Gemini, Groq, and OpenAI are optional external provider routes. Model licenses require separate review.
   - **Queue & Message Bus**: In-Memory Event Queue, Redis BullMQ.

6. **Enterprise Security & Accessibility (WCAG AA)**:
   - 6 predefined granular roles: `SUPER_ADMIN`, `FINANCIAL_CONTROLLER`, `HR_DIRECTOR`, `DEPARTMENT_HEAD`, `SENIOR_ACCOUNTANT`, `STAFF_EMPLOYEE`.
   - Immutable audit logging tracking user, timestamp, IP, action, and module.
   - High-contrast visual tokens, full keyboard accessibility (`Cmd+K` / `Ctrl+K` command palette, `Escape` modal dismissals), and dark/light mode toggles.

---

## 📐 High-Level Architecture Overview

```
                                  +------------------------------------+
                                  |        Browser Client (React 19)   |
                                  |   Tailwind v4 | Lucide | Decimal   |
                                  +------------------+-----------------+
                                                     |
                                            HTTP / JSON APIs
                                                     |
                                  +------------------v-----------------+
                                  |     Express Full-Stack Server      |
                                  |            (server.ts)             |
                                  +--------+------------------+--------+
                                           |                  |
               +---------------------------+                  +----------------------------+
               |                                                                           |
+--------------v---------------+                                              +------------v-------------+
|    AI & Extraction Engine    |                                              |    Vite Dev & Static     |
|   Gemini 3.8 / Groq / Ollama |                                              |      Bundle Server       |
+------------------------------+                                              +--------------------------+
               |
               +---------------------------+---------------------------+
                                           |                           |
                            +--------------v-------------+ +-----------v--------------+
                            |     Cross-Domain Event     | |  Pluggable Providers     |
                            |         Bus (Pub/Sub)      | |  DB | S3 | LLM | Queue   |
                            +--------------+-------------+ +--------------------------+
                                           |
                        +------------------+------------------+
                        |                                     |
           +------------v------------+           +------------v------------+
           |   Accounting Domain     |           |       HRM Domain        |
           | Double-Entry GL Engine  |           | Workforce & Payroll     |
           | Chart of Accounts (COA) |           | Attendance & Directory  |
           +-------------------------+           +-------------------------+
```

---

## 📁 Repository Structure

```
├── .env.example              # Environment variables template
├── metadata.json             # Applet metadata, permissions & capabilities
├── package.json              # NPM dependencies and run scripts
├── server.ts                 # Full-stack Express server + Gemini & Multi-LLM routes
├── vite.config.ts            # Vite 8 configuration with Tailwind v4 & React plugin
├── index.html                # Single Page Application HTML entry point
│
├── docs/                     # Comprehensive Architecture & Engineering Guides
│   ├── ARCHITECTURE.md       # Full architectural blueprint & domain models
│   ├── ACCOUNTING_ENGINE.md  # Decimal.js double-entry math & ledger specs
│   ├── HRM_WORKFORCE.md      # Workforce, attendance, and payroll mechanics
│   ├── PROVIDERS.md          # Database, storage, queue, and AI adapter guides
│   ├── RBAC_SECURITY.md      # Roles, permissions, audit trails & session management
│   └── API_REFERENCE.md      # HTTP endpoints, payloads, schemas, and responses
│
└── src/
    ├── main.tsx              # React client entry point
    ├── App.tsx               # Main routing, state container & layout coordination
    ├── index.css             # Tailwind CSS v4 design tokens and base styles
    ├── types.ts              # Core TypeScript models, enums & interfaces
    │
    ├── components/           # UI Components & Modules
    │   ├── AccountingView.tsx       # GL, Journal Entries, Chart of Accounts, Reports
    │   ├── AIInvoiceView.tsx        # Outbound prompt-driven invoice generator & OCR AP
    │   ├── CommandPalette.tsx       # Cmd+K global spotlight command palette
    │   ├── DashboardView.tsx        # Enterprise financial & workforce KPI cockpit
    │   ├── Header.tsx               # Primary global navigation & breadcrumbs
    │   ├── HRMView.tsx              # Directory, Departments, Attendance, Leave, Payroll
    │   ├── Modal.tsx                # Accessible, focus-trapped dialog system
    │   ├── ProvidersView.tsx        # Live health monitors & cloud provider switcher
    │   ├── ReceiptTrackerView.tsx   # Split-screen OCR receipt canvas & expense hub
    │   ├── SettingsView.tsx         # User profiles, brand customization & directory
    │   ├── Sidebar.tsx              # Collapsible multi-module sidebar navigation
    │   └── TopBar.tsx               # Search, notifications, user switcher & quick actions
    │
    ├── domains/              # Business Domain Logic
    │   ├── accounting/
    │   │   ├── gl-engine.ts         # Double-entry ledger core with journal validation
    │   │   └── receipt-engine.ts    # Receipt persistence & automated categorization
    │   ├── core/
    │   │   ├── rbac.ts              # RBAC security engine, user store & audit logging
    │   │   └── theme-context.tsx    # Dark/Light theme state & local persistence
    │   ├── events/
    │   │   └── event-bus.ts         # Decoupled domain message bus (e.g. payroll -> GL)
    │   └── hrm/
    │       └── hrm-engine.ts        # Employee, department, attendance & payroll engine
    │
    ├── lib/                  # Shared Utility Libraries
    │   ├── base-url.ts              # Dynamic API base URL resolution
    │   └── math.ts                  # Decimal.js wrapper & currency formatting utilities
    │
    └── providers/            # Infrastructure Adapters (Factory Pattern)
        ├── factory.ts               # ProviderFactory instantiating active drivers
        └── types.ts                 # Interfaces for IDatabase, IStorage, IAIEngine, IQueue
```

---

## ⚡ Quick Start & Setup Guide

### 1. Prerequisites
- **Bun**: Version `1.4.2` for the pinned lockfile and scripts.
- **Docker Compose**: Optional, for the local PostgreSQL service.

### 2. Installation
Clone the repository and install the pinned dependencies:

```bash
git clone <your-repository-url>
cd audma-os
bun install --frozen-lockfile
```

### 3. Environment Configuration
Create or update `.env` from `.env.example`; do not overwrite an existing file because it may contain local credentials. `.env` is ignored by Git. Never commit real secrets.

```bash
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

Open `.env` and configure your credentials:

```ini
# Local Ollama endpoint (default provider; start Ollama and select an installed vision-capable model)
OLLAMA_BASE_URL="http://localhost:11434"

# Application URL
APP_URL="http://localhost:3000"

# Pluggable Provider Selection (defaults to robust in-memory/local mode)
DB_PROVIDER="in_memory"             # neon | supabase | postgres_local | in_memory
STORAGE_PROVIDER="local"            # cloudflare_r2 | supabase_storage | minio | local
AI_PROVIDER="ollama"                # ollama | gemini | groq | openai
QUEUE_PROVIDER="memory"             # bullmq | memory

# Optional external provider keys
GEMINI_API_KEY=""
GROQ_API_KEY=""
OPENAI_API_KEY=""
REDIS_URL="redis://localhost:6379"
```

> AI provider failures return an explicit unavailable response. The server does not return synthetic invoice or receipt results as though they were extracted data.

For an isolated, development-only PostgreSQL schema smoke test, use the separate `compose.env.example`; its password is public and must only be used with local synthetic data:

```powershell
docker compose --env-file compose.env.example up -d postgres
bun --env-file=compose.env.example run db:migrate
```

This creates the schema only. The accounting and HRM engines still use in-memory state; selecting PostgreSQL does not make business workflows persistent yet. The local Compose database is development-only and must not contain live data.

### 4. Running the Development Server
Launch the unified full-stack server (Node.js Express + Vite HMR) on port `3000`:

```bash
bun run dev
```

Open your browser and navigate to:
```
http://localhost:3000
```

### 5. Production Build & Execution
To create an optimized production bundle and run it:

```bash
# 1. Typecheck, test, and bundle both Vite client and Express server
bun run lint
bun run test
bun run build

# 2. Start the production server
bun run start
```

---

## 💻 Available Scripts

| Script | Command | Purpose |
| :--- | :--- | :--- |
| `bun run dev` | `tsx server.ts` | Runs the local server with Vite middleware. |
| `bun run test` | `tsx --test ...` | Runs financial, AI resilience, database health, and schema regression tests. |
| `bun run db:migrate` | `node-pg-migrate up` | Applies SQL migrations to the configured database. |
| `bun run db:rollback` | `node-pg-migrate down` | Rolls back the latest migration; only use on disposable/test databases. |
| `bun run lint` | `tsc --noEmit` | Executes TypeScript type checking across the project. |
| `bun run build` | `vite build && esbuild ...` | Builds the React client and compiled Express server. |
| `bun run start` | `node dist/server.cjs` | Runs the compiled server; this does not mean production gates have passed. |

---

## 📚 In-Depth Documentation Index

For detailed architectural diagrams, mathematical specifications, and domain manuals, please refer to the documents in `/docs`:

1. [**System Architecture & Domain Model** (`docs/ARCHITECTURE.md`)](./docs/ARCHITECTURE.md)  
   Complete architectural overview, decoupling strategies, state models, and component taxonomy.
2. [**Double-Entry Accounting Engine** (`docs/ACCOUNTING_ENGINE.md`)](./docs/ACCOUNTING_ENGINE.md)  
   Mathematical proof of ledger balance, Decimal.js integration, Chart of Accounts, and financial reporting formulas.
3. [**HRM & Workforce Management** (`docs/HRM_WORKFORCE.md`)](./docs/HRM_WORKFORCE.md)  
   Employee profiles, department hierarchies, time/attendance validation, and payroll formula mechanics.
4. [**Pluggable Provider Architecture** (`docs/PROVIDERS.md`)](./docs/PROVIDERS.md)  
   Factory pattern details, health monitoring probes, and driver guides for Neon, Supabase, Cloudflare R2, MinIO, BullMQ, and LLMs.
5. [**Role-Based Access Control (RBAC) & Security** (`docs/RBAC_SECURITY.md`)](./docs/RBAC_SECURITY.md)  
   Permission matrices, role hierarchies, audit logging mechanisms, and user simulation workflows.
6. [**API Reference & Endpoints** (`docs/API_REFERENCE.md`)](./docs/API_REFERENCE.md)  
   Comprehensive specification of `/api/health`, `/api/ai/extract-invoice`, `/api/ai/extract-receipt`, and `/api/ai/generate-invoice`.

---

## Security & Integrity Status

- **Financial arithmetic:** The current in-memory ledger uses Decimal.js and rejects invalid/unbalanced journal entries in tested paths.
- **Database baseline:** PostgreSQL migration constraints enforce posting rules for records written through that schema; current domain operations do not yet use it.
- **Authentication/audit:** Server authentication and durable audit enforcement are not implemented; demo persona state is not an authorization boundary.
- **AI failures:** Server AI failure returns an unavailable response rather than fabricated extraction data.

---

## 👥 Default Demo User Roles

Switch between users anytime via the top right user menu or **Settings &rarr; Directory**:

| User | Role | Access Scope |
| :--- | :--- | :--- |
| **Eleanor Vance** | `SUPER_ADMIN` | Unrestricted access across GL, HRM, Providers, Settings, and Audit Logs. |
| **Marcus Brody** | `FINANCIAL_CONTROLLER` | Full Accounting, Journal Posting, AP/AR Approvals, Financial Reports, Audit Logs. |
| **Sarah Jenkins** | `HR_DIRECTOR` | Employee Management, Attendance Oversight, Leave Approvals, Payroll Execution. |
| **David Chen** | `DEPARTMENT_HEAD` | Department Employee Oversight, Leave Approvals, Team Expense Claims. |
| **Elena Rostova** | `SENIOR_ACCOUNTANT` | Journal Entry Preparation, Invoice Review, Expense Receipt Audit. |
| **James Wilson** | `STAFF_EMPLOYEE` | Personal Attendance Clock-In, Self-Service Leave Requests, Receipt Expense Claims. |

---

## 📄 License & Intellectual Property

AUDMA OS Enterprise Monolith is released under commercial enterprise license terms. All rights reserved.
