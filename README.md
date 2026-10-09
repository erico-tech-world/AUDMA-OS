# AUDMA OS - Enterprise Financial & Human Resource Monolith

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646cff.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8.svg)](https://tailwindcss.com/)
[![Express](https://img.shields.io/badge/Backend-Express%20v4-lightgrey.svg)](https://expressjs.com/)
[![Google Gemini](https://img.shields.io/badge/AI-Gemini%203.8%20Flash-4285F4.svg)](https://ai.google.dev/)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)]()

> **AUDMA OS** is an enterprise-grade Operating System seamlessly integrating **General Ledger Double-Entry Accounting**, **Workforce & Human Resource Management (HRM)**, **Automated AP/AR Invoicing & Receipt Audit Hub**, and an **Enterprise Pluggable Provider Architecture** (Database, Storage, AI, and Queues) with granular Role-Based Access Control (RBAC).

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
   - Multi-modal Optical Character Recognition (OCR) powered by Google Gemini and pluggable LLMs (Groq, OpenAI, Ollama, Claude, DeepSeek).
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
   - **AI/LLM Engine**: Google Gemini (`@google/genai`), Groq Llama 3, Local Ollama, OpenAI, Claude, DeepSeek, Offline Heuristic OCR.
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
- **Node.js**: Version `18.0.0` or higher (`20+` or `22+` recommended).
- **npm**: Version `9.0.0` or higher (or `pnpm` / `yarn`).
- **Google Gemini API Key** (optional for local mock mode, required for live AI OCR): Get a key at [Google AI Studio](https://aistudio.google.com/).

### 2. Installation
Clone the repository and install the required npm dependencies:

```bash
git clone https://github.com/your-org/audma-os.git
cd audma-os
npm install
```

### 3. Environment Configuration
Copy the `.env.example` file to create your local `.env`:

```bash
cp .env.example .env
```

Open `.env` and configure your credentials:

```ini
# Google Gemini API Key (for receipt & invoice OCR and generation)
GEMINI_API_KEY="your-gemini-api-key-here"

# Application URL
APP_URL="http://localhost:3000"

# Pluggable Provider Selection (defaults to robust in-memory/local mode)
DB_PROVIDER="in_memory"             # neon | supabase | postgres_local | in_memory
STORAGE_PROVIDER="local"            # cloudflare_r2 | supabase_storage | minio | local
AI_PROVIDER="gemini"                # gemini | groq | ollama | local_ocr
QUEUE_PROVIDER="memory"             # bullmq | memory

# Optional Third-Party Keys
GROQ_API_KEY=""
OLLAMA_BASE_URL="http://localhost:11434"
REDIS_URL="redis://localhost:6379"
```

> **Note**: If `GEMINI_API_KEY` is not provided or set to a placeholder, the system automatically falls back to an **Intelligent Mock OCR & Billing Engine**, allowing full offline prototyping with realistic enterprise data!

### 4. Running the Development Server
Launch the unified full-stack server (Node.js Express + Vite HMR) on port `3000`:

```bash
npm run dev
```

Open your browser and navigate to:
```
http://localhost:3000
```

### 5. Production Build & Execution
To create an optimized production bundle and run it:

```bash
# 1. Typecheck & bundle both Vite client and Express server
npm run build

# 2. Start the production server
npm start
```

---

## 💻 Available Scripts

| Script | Command | Purpose |
| :--- | :--- | :--- |
| `npm run dev` | `tsx server.ts` | Runs the full-stack server with Vite middleware on port 3000. |
| `npm run build` | `vite build && esbuild ...` | Bundles the React client into `/dist` and compiles `server.ts` to `/dist/server.cjs`. |
| `npm start` | `node dist/server.cjs` | Runs the standalone compiled production server. |
| `npm run lint` | `tsc --noEmit` | Executes TypeScript type checking across the entire project. |
| `npm run clean` | `rm -rf dist server.js` | Cleans up previous build artifacts and caches. |

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

## 🛡️ Enterprise Security & Integrity Guarantees

- **No Float Inaccuracy**: Financial systems that use standard JavaScript `number` suffer from `0.1 + 0.2 === 0.30000000000000004`. AUDMA OS mandates `Decimal.js` across every ledger debit, credit, balance, tax calculation, and payroll disbursement.
- **Strict Invariance**: A journal entry cannot be written unless `totalDebits.equals(totalCredits)`.
- **Immutable Audit Trails**: Every state mutation (journal entry, payroll approval, employee termination, provider swap) creates an immutable audit record with user ID, role, action, and timestamp.
- **Graceful Degraded Mode**: All cloud dependencies (Gemini, Neon, Supabase, S3) feature zero-crash local in-memory fallbacks when external connections are unavailable.

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
