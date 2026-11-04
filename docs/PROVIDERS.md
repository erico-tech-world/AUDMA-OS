# AUDMA OS - Pluggable Provider Architecture Specification

> **Implementation status:** This document describes intended provider contracts, not proof that every adapter is operational. PostgreSQL is now used for a bounded connectivity probe and migrations, but domain workflows still use in-memory engines. Neon/Supabase database classes route through the same `DATABASE_URL` check; they do not implement provider-specific auth/RLS. Object storage adapters, BullMQ/Redis, and several AI health responses remain placeholders. Only server AI routes for Gemini, Groq, OpenAI, and Ollama are selectable; route authentication and managed secrets are not implemented.

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
1. **In-Memory (Current business engines):** accounting and HRM domain services currently store state in process memory.
2. **PostgreSQL connectivity:** `pg` is used by a bounded `SELECT 1` health probe. Migrations live in `migrations/` and use `node-pg-migrate`.
3. **Neon/Supabase labels:** these are provider choices in the UI, not distinct drivers. They currently use the same `DATABASE_URL` probe and do not implement provider-specific RLS or integration.
4. **Local PostgreSQL:** a development Compose service is available, but business operations are not yet routed through PostgreSQL repositories.

### 3.2 Storage Providers (`IStorageProvider`)
Storage classes are prototypes; they do not yet provide production S3-compatible persistence, malware scanning, authorization, or retention enforcement. Do not upload real documents.

### 3.3 AI / Vision Engines (`IAIEngineProvider`)
The server API currently allows Gemini, Groq, OpenAI, and Ollama. Verify endpoint/model availability, credentials, and model license suitability before use. Claude, DeepSeek, and local heuristic adapters are not supported by the current server routes. AI results require manual review; provider failures return an error.

### 3.4 Queue & Message Bus Providers (`IQueueProvider`)
The in-process event bus exists for local demonstration. The BullMQ class does not have a production Redis/BullMQ dependency or durable job implementation. Treat queue health as unverified until implemented and tested.

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

## 5. Health Probe Status

The PostgreSQL health adapter performs a real bounded SQL round trip when `DATABASE_URL` is configured. Other provider health methods may still return static demo states; inspect the implementation before relying on any status.

When queried, the health checker:
1. Opens a lightweight socket or sends a test ping to the target endpoint.
2. Measures round-trip latency in milliseconds (`latencyMs`).
3. Verifies authorization credentials and operational readiness.
4. Returns a status of `HEALTHY`, `DEGRADED`, or `DOWN`.

This powers the live status dashboard in **ProvidersView.tsx**, giving administrators real-time visibility into infrastructure health.
