# AUDMA OS - Pluggable Provider Architecture Specification

## 1. Architectural Motivation

Enterprise systems often face infrastructure lock-in when business logic directly depends on a specific database, storage bucket, or AI model. 

AUDMA OS addresses this through a **Pluggable Provider Architecture** based on the **Factory Pattern** and **Interface-Driven Design**. The application interacts strictly with abstract interfaces (`IDatabaseProvider`, `IStorageProvider`, `IAIEngineProvider`, `IQueueProvider`), allowing seamless transitions between cloud services, on-premise infrastructure, and offline development environments.

---

## 2. Core Provider Interfaces (`src/providers/types.ts`)

```typescript
export interface ProviderHealth {
  name: string;
  type: string;
  status: 'HEALTHY' | 'DEGRADED' | 'DOWN';
  latencyMs: number;
  endpoint?: string;
  description?: string;
  error?: string;
}

export interface IDatabaseProvider {
  type: DBProviderType;
  name: string;
  connect(): Promise<boolean>;
  checkHealth(): Promise<ProviderHealth>;
  disconnect(): Promise<void>;
}

export interface IStorageProvider {
  type: StorageProviderType;
  name: string;
  upload(fileData: string | Uint8Array, fileName: string, mimeType: string): Promise<StorageUploadResult>;
  getUrl(key: string): Promise<string>;
  delete(key: string): Promise<boolean>;
  checkHealth(): Promise<ProviderHealth>;
}

export interface IAIEngineProvider {
  type: AIProviderType;
  name: string;
  extractInvoice(docBase64OrText: string, mimeType?: string): Promise<AIExtractionResult>;
  extractReceipt?(docBase64OrText: string, mimeType?: string): Promise<any>;
  generateInvoice?(prompt: string, content?: string, mimeType?: string): Promise<GeneratedInvoiceData>;
  checkHealth(): Promise<ProviderHealth>;
}

export interface IQueueProvider {
  type: QueueProviderType;
  name: string;
  publish<T>(eventName: string, payload: T): Promise<string>;
  subscribe<T>(eventName: string, handler: (payload: T) => Promise<void>): () => void;
  getPendingJobsCount(): Promise<number>;
  checkHealth(): Promise<ProviderHealth>;
}
```

---

## 3. Supported Infrastructure Adapters

### 3.1 Database Providers (`IDatabaseProvider`)
1. **In-Memory (Local / Prototype)**:
   - Zero-dependency local memory store.
   - Ideal for testing, continuous integration, and ephemeral environments.
2. **Neon Serverless Postgres**:
   - Serverless PostgreSQL with autoscaling and branching.
   - Configured via connection string `DATABASE_URL`.
3. **Supabase Postgres**:
   - Hosted PostgreSQL with Row Level Security (RLS) and connection pooling.
4. **Local PostgreSQL**:
   - Standard Dockerized or bare-metal PostgreSQL instance running on port 5432.

### 3.2 Storage Providers (`IStorageProvider`)
1. **Local Disk / Base64 Data URI**:
   - In-memory and local disk persistence. Zero external S3 dependencies needed for prototyping.
2. **Cloudflare R2**:
   - S3-compatible, zero-egress fee object storage.
   - Fast edge file retrieval for scanned invoices and receipts.
3. **Supabase Storage**:
   - S3-compatible bucket integration with built-in asset CDN.
4. **MinIO S3**:
   - Self-hosted S3-compliant storage for on-premise air-gapped enterprise environments.

### 3.3 AI / Vision Engines (`IAIEngineProvider`)
1. **Google Gemini (`gemini-3.8-flash`)**:
   - Primary high-accuracy multimodal engine powered by `@google/genai`.
   - Analyzes receipts, tilted camera images, itemized bills, and detects blurry/unclear documents with confidence scoring.
2. **Groq (Llama-3-Vision / Mixtral)**:
   - Ultra-low latency inference using OpenAI-compatible endpoints.
3. **Ollama (Self-Hosted Local LLMs)**:
   - Offline, privacy-compliant local inference (`http://localhost:11434`) using open-weight models.
4. **OpenAI / Claude / DeepSeek**:
   - Supported via standard OpenAI-compatible API schemas in `server.ts`.
5. **Local Heuristic / Mock OCR**:
   - Deterministic offline engine ensuring the system functions seamlessly even without external API keys or internet access.

### 3.4 Queue & Message Bus Providers (`IQueueProvider`)
1. **In-Memory Event Bus**:
   - Non-blocking in-memory queue. Immediate local domain event dispatching.
2. **Redis BullMQ**:
   - Production distributed task queue with retry logic, delayed jobs, and rate limiting.

---

## 4. The Provider Factory Pattern (`src/providers/factory.ts`)

The `ProviderFactory` manages singleton instances of each active provider:

```typescript
export class ProviderFactory {
  private static instance: ProviderFactory;
  
  public getDatabase(): IDatabaseProvider;
  public getStorage(): IStorageProvider;
  public getAI(): IAIEngineProvider;
  public getQueue(): IQueueProvider;
  
  public setDatabaseProvider(type: DBProviderType): void;
  public setStorageProvider(type: StorageProviderType): void;
  public setAIProvider(type: AIProviderType): void;
  public setQueueProvider(type: QueueProviderType): void;
  
  public async checkAllHealth(): Promise<Record<string, ProviderHealth>>;
}
```

### Dynamic Runtime Switching
Administrators can switch providers at runtime directly from **Settings &rarr; Cloud Providers**:
```typescript
const factory = ProviderFactory.getInstance();
factory.setAIProvider('gemini');
factory.setDatabaseProvider('neon');
```
The application dynamically updates its health metrics without requiring a service restart.

---

## 5. Live Health Probing

Every registered provider exposes a `checkHealth(): Promise<ProviderHealth>` method.

When queried, the health checker:
1. Opens a lightweight socket or sends a test ping to the target endpoint.
2. Measures round-trip latency in milliseconds (`latencyMs`).
3. Verifies authorization credentials and operational readiness.
4. Returns a status of `HEALTHY`, `DEGRADED`, or `DOWN`.

This powers the live status dashboard in **ProvidersView.tsx**, giving administrators real-time visibility into infrastructure health.
