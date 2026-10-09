# AUDMA OS - System Architecture Specification

## 1. Architectural Philosophy & Principles

AUDMA OS is engineered as an **Enterprise Domain Monolith** designed for high cohesion, operational simplicity, and strict computational correctness. It brings together financial double-entry ledger bookkeeping, human capital management (HRM), and automated document perception into a unified runtime environment.

### Core Architectural Axioms
1. **Zero Financial Float Tolerances**:
   Every monetary figure (ledger balances, journal entry lines, invoices, tax withholdings, and payroll line items) is represented and computed using arbitrary-precision decimal arithmetic (`decimal.js`). Floating-point approximations (`0.1 + 0.2 != 0.3`) are banned in the core ledger.
2. **Strict Invariant Validation**:
   Financial transactions cannot be created without passing equality checks:
   $$\sum \text{Debits} = \sum \text{Credits}$$
   If an out-of-balance journal is attempted, the engine halts execution with a deterministic domain error.
3. **Decoupled Cross-Domain Eventing**:
   Domains (HRM, Accounting, AP/AR) communicate asynchronously through an event bus. The HRM domain does not directly invoke ledger writes; it dispatches domain events (e.g. `hrm.payroll.finalized`), which the accounting domain subscribes to and records as journal entries.
4. **Pluggable Infrastructure Layer (Hexagonal / Clean Architecture)**:
   The core business rules are strictly separated from drivers. Database, Object Storage, AI Extraction, and Queue systems implement defined TypeScript interfaces, allowing zero-downtime switching between cloud managed services (Neon, Supabase, Cloudflare R2, Redis BullMQ, Gemini) and offline/local fallback drivers.

---

## 2. System Architecture Blueprint

```
+----------------------------------------------------------------------------------------------------+
|                                           PRESENTATION LAYER                                       |
|                                         (React 19 SPA + Vite 8)                                    |
|                                                                                                    |
|   +-------------------+  +-------------------+  +-------------------+  +-----------------------+   |
|   |   DashboardView   |  |   AccountingView  |  |      HRMView      |  | ReceiptTrackerView    |   |
|   |  - KPI Cockpit    |  |  - General Ledger |  |  - Staff Directory|  |  - Split OCR Canvas   |   |
|   |  - Quick Insights |  |  - Balance Sheet  |  |  - Dept Hierarchy |  |  - Daily Expense Hub  |   |
|   |  - P&L Overview   |  |  - Trial Balance  |  |  - Attendance/GPS |  |  - Category Mapping   |   |
|   |  - Cash Flow      |  |  - Journal Entry  |  |  - Payroll Engine |  |  - Approval Pipeline  |   |
|   +-------------------+  +-------------------+  +-------------------+  +-----------------------+   |
|   +-------------------+  +-------------------+  +-------------------+  +-----------------------+   |
|   |   AIInvoiceView   |  |   ProvidersView   |  |    SettingsView   |  |    CommandPalette     |   |
|   |  - Outbound Bill  |  |  - Driver Health  |  |  - Role / RBAC    |  |  - Cmd+K Spotlight    |   |
|   |  - Natural Prompt |  |  - Live Latency   |  |  - Brand Tokens   |  |  - Universal Nav      |   |
|   |  - AP Bill Verify |  |  - Config Switch  |  |  - Audit Log View |  |  - Modal Manager      |   |
|   +-------------------+  +-------------------+  +-------------------+  +-----------------------+   |
+--------------------------------------------------+-------------------------------------------------+
                                                   | HTTP Fetch & REST
+--------------------------------------------------v-------------------------------------------------+
|                                        APPLICATION SERVER LAYER                                    |
|                                         (Express 4 + Node.js)                                      |
|                                                                                                    |
|  [REST Endpoints]                                                                                  |
|   - GET  /api/health                                                                               |
|   - POST /api/ai/extract-invoice       -> Multi-LLM AP Invoice Document OCR Engine                 |
|   - POST /api/ai/extract-receipt       -> Multi-LLM Daily Expense & GL Auto-Categorizer            |
|   - POST /api/ai/generate-invoice      -> Prompt-Driven Outbound Sales Invoicing                   |
|                                                                                                    |
|  [Vite Dev Middleware / Production Static File Engine]                                             |
+--------------------------------------------------+-------------------------------------------------+
                                                   |
+--------------------------------------------------v-------------------------------------------------+
|                                         CORE DOMAIN ENGINES                                        |
|                                                                                                    |
|  +------------------------+  +--------------------------+  +------------------------------------+  |
|  |   Accounting Domain    |  |        HRM Domain        |  |         Security & RBAC            |  |
|  | - Chart of Accounts    |  | - Employee Directory     |  | - Role Hierarchy (6 Tiers)         |  |
|  | - General Ledger Engine|  | - Department Head Org    |  | - Granular Permission Checking    |  |
|  | - Journal Entry Ledger |  | - Time & Geofence Clocks |  | - User Session Simulator           |  |
|  | - Financial Statements |  | - Statutory Payroll Run  |  | - Immutable Audit Log Ledger       |  |
|  +-----------^------------+  +------------+-------------+  +------------------------------------+  |
|              |                            |                                                        |
|              +--------------+-------------+                                                        |
|                             |                                                                      |
|            +----------------v------------------+                                                   |
|            |     Decoupled Domain Event Bus    |                                                   |
|            |     (hrm.payroll.finalized -> GL) |                                                   |
|            +----------------+------------------+                                                   |
+-----------------------------+----------------------------------------------------------------------+
                              |
+-----------------------------v----------------------------------------------------------------------+
|                                    PLUGGABLE INFRASTRUCTURE PROVIDERS                              |
|                                             (Factory Pattern)                                      |
|                                                                                                    |
|  [Database Adapters]         [Storage Adapters]      [AI / Vision Adapters]    [Queue Adapters]    |
|   - Neon Serverless Postgres  - Cloudflare R2         - Google Gemini 3.8 Flash  - BullMQ (Redis)  |
|   - Supabase Postgres         - Supabase Storage      - Groq Llama-3 Vision      - In-Memory Queue |
|   - Local PostgreSQL          - MinIO S3              - Ollama Local LLM                           |
|   - In-Memory (Dev/Mock)      - Local Base64 / Disk   - Offline Heuristic Engine                   |
+----------------------------------------------------------------------------------------------------+
```

---

## 3. Domain Decomposition & Responsibilities

### 3.1 Accounting & General Ledger Domain (`src/domains/accounting/`)
- **`gl-engine.ts`**: The system's financial source of truth. Maintains accounts, journals, and accounts payable/receivable balances.
  - Generates immutable sequential journal entry IDs (`JE-2026-0001`).
  - Computes the **Trial Balance**, ensuring debit and credit columns balance to the penny.
  - Dynamically synthesizes the **Balance Sheet** ($Assets = Liabilities + Equity$) and **Income Statement** ($Net Income = Revenue - Expenses$).
  - Evaluates AP/AR aging (Current, 1-30 days, 31-60 days, 60+ days overdue).
- **`receipt-engine.ts`**: Manages personal employee expense claims, daily operating slips, and receipt audit verification workflows.
  - Automatically matches vendor categories to standard expense account codes:
    - Fuel & fleet logistics &rarr; Account `5250`
    - Meals, hospitality & travel &rarr; Account `5350`
    - Office stationery & consumables &rarr; Account `5450`
    - Cloud infrastructure & software &rarr; Account `5200`

### 3.2 Human Resource Management (HRM) Domain (`src/domains/hrm/`)
- **`hrm-engine.ts`**: Manages employee profiles, organizational departments, leaves, attendance, and payroll cycles.
  - **Department Hierarchy**: Tracks departments, manager assignments, and employee headcounts.
  - **Attendance Engine**: Tracks daily clock-in/out timestamps, computes worked hours and overtime, records geolocation and IP addresses, and prevents duplicate clock-ins on the same calendar day.
  - **Leave Management**: Supports Annual, Sick, Parental, Unpaid, and Remote leave types with multi-stage approval states (`PENDING`, `APPROVED`, `REJECTED`).
  - **Payroll Processor**: Aggregates employee base salaries, statutory income tax deductions (default 15%), and pension contributions (default 8%), calculating net disburseable pay. Dispatches domain events upon finalization.

### 3.3 Event Bus & Cross-Domain Orchestration (`src/domains/events/`)
- **`event-bus.ts`**: Implements a clean, decoupled event mediator.
  - When payroll is finalized in HRM, an `hrm.payroll.finalized` event is published containing gross salary, net pay, tax withholdings, and pension totals.
  - The event listener automatically generates and commits a balanced four-legged journal entry to the General Ledger:
    - **Debit**: Salaries & Wages Expense (`5100`)
    - **Credit**: Cash & Operating Bank Account (`1010`)
    - **Credit**: Payroll Tax Withholding Payable (`2100`)
    - **Credit**: Pension & Retirement Contribution Payable (`2110`)

### 3.4 Core Security & RBAC Domain (`src/domains/core/`)
- **`rbac.ts`**: Implements hierarchical and granular access control.
  - Maps 6 enterprise roles to 13 discrete capabilities (`accounting:view`, `accounting:post_journal`, `hrm:manage_employees`, `hrm:run_payroll`, `admin:providers`, etc.).
  - Tracks user active sessions and provides a user switcher for role simulation.
  - Maintains an immutable in-memory and persistent audit log capturing actor, role, timestamp, action code, module, and detailed message.

---

## 4. Data Flow Specifications

### Data Flow 1: AP Document OCR & Automatic GL Posting
```
[User uploads receipt/invoice image]
                │
                ▼
[Client invokes POST /api/ai/extract-invoice or /api/ai/extract-receipt]
                │
                ▼
[Express Server routes to selected AI Provider (Gemini / Groq / Ollama / Local)]
                │
                ▼
[AI extracts merchant, dates, tax, line items, clarity evaluation, and suggested account code]
                │
                ▼
[Client displays side-by-side interactive verification canvas]
                │
                ▼
[User confirms and clicks "Approve & Post to GL"]
                │
                ▼
[glEngine.postJournalEntry generates balanced journal]
   - Debit: Expense Account (e.g. 5200 or 5450)
   - Credit: Accounts Payable (2000) or Bank Cash (1010)
                │
                ▼
[Audit log records transaction with user ID and timestamp]
```

### Data Flow 2: Payroll Run & Automated Ledger Accrual
```
[HR Director reviews and finalizes monthly payroll]
                │
                ▼
[hrmEngine computes Gross, Net, Tax, Pension deductions]
                │
                ▼
[eventBus.publish('hrm.payroll.finalized', payload)]
                │
                ▼
[EventBus listener receives payload asynchronously]
                │
                ▼
[glEngine posts 4-line balanced journal entry]
   - Debit 5100 (Gross Salaries)
   - Credit 1010 (Net Bank Disbursement)
   - Credit 2100 (Tax Liability)
   - Credit 2110 (Pension Liability)
                │
                ▼
[Real-time General Ledger, Balance Sheet, and P&L update instantly]
```

---

## 5. Technology Stack & Decision Matrix

| Dimension | Selected Technology | Rationale |
| :--- | :--- | :--- |
| **Frontend Framework** | React 19 + TypeScript | High performance, modern declarative UI hooks, and strict type safety across complex domain models. |
| **Styling & Design System** | Tailwind CSS v4 (`@tailwindcss/vite`) | Low bundle overhead, high visual consistency, instant dark-mode tokens, and strict WCAG AA contrast compliance. |
| **Build Tooling** | Vite 8 + ESBuild | Sub-second cold starts, instant hot module reloading during development, and tight TypeScript compilation. |
| **Financial Math Engine** | Decimal.js (20-digit precision) | Eliminates IEEE 754 floating-point errors; essential for general ledger balancing and tax calculations. |
| **Backend Runtime** | Node.js + Express 4 (`server.ts`) | Single-instance full-stack monolith simplicity, hosting both Vite middleware and universal AI proxy endpoints. |
| **AI Perception** | `@google/genai` (Gemini 3.8 Flash) | High multimodal accuracy for invoices, tables, skewed receipts, handwritten slips, and clarity scoring. |
| **Icons & Visuals** | Lucide React (`lucide-react`) | Standardized, accessible, and lightweight enterprise icon system. |

---

## 6. Directory Layout & Module Index

```
/
├── package.json              # App dependencies & scripts
├── tsconfig.json             # TypeScript compiler settings
├── vite.config.ts            # Vite 8 config
├── server.ts                 # Full-stack Node.js server
├── index.html                # App entry point
├── metadata.json             # Applet capabilities & permissions
│
├── docs/                     # Architectural & Engineering manuals
│   ├── ARCHITECTURE.md       # (This file) System blueprint
│   ├── ACCOUNTING_ENGINE.md  # Detailed ledger & financial mechanics
│   ├── HRM_WORKFORCE.md      # Workforce, attendance & payroll
│   ├── PROVIDERS.md          # Pluggable adapter interfaces & setup
│   ├── RBAC_SECURITY.md      # Security & access control specifications
│   └── API_REFERENCE.md      # HTTP API documentation
│
└── src/
    ├── types.ts              # Core shared data contracts
    ├── lib/
    │   ├── math.ts           # Decimal.js math wrapper & utilities
    │   └── base-url.ts       # Endpoint URL resolver
    ├── domains/
    │   ├── accounting/       # GL engine, COA, receipts
    │   ├── hrm/              # Employees, attendance, leaves, payroll
    │   ├── events/           # Asynchronous decoupled event bus
    │   └── core/             # RBAC, audit logger, theme context
    ├── providers/            # Infrastructure adapters (DB, S3, AI, Queue)
    └── components/           # Modular view components (Accounting, HRM, etc.)
```
