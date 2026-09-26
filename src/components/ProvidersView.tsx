import React, { useState, useEffect } from 'react';
import {
  Layers,
  Database,
  HardDrive,
  Sparkles,
  Workflow,
  CheckCircle2,
  Activity,
  RefreshCw,
  Server,
  Zap,
  Shield,
  ExternalLink,
  Code2,
} from 'lucide-react';
import { ProviderFactory } from '../providers/factory';
import { ProviderHealth, DBProviderType, StorageProviderType, AIProviderType, QueueProviderType } from '../types';
import { getBaseUrl } from '../lib/base-url';

export const ProvidersView: React.FC = () => {
  const factory = ProviderFactory.getInstance();
  const [config, setConfig] = useState(factory.getConfig());
  const [healths, setHealths] = useState<ProviderHealth[]>([]);
  const [isPinging, setIsPinging] = useState(false);
  const baseUrl = getBaseUrl();

  const runHealthCheck = async () => {
    setIsPinging(true);
    try {
      const results = await factory.getHealthReport();
      setHealths(results);
    } catch (e) {
      console.error(e);
    } finally {
      setIsPinging(false);
    }
  };

  useEffect(() => {
    runHealthCheck();
  }, [config]);

  const handleDBChange = (type: DBProviderType) => {
    factory.setDBProvider(type);
    setConfig(factory.getConfig());
  };

  const handleStorageChange = (type: StorageProviderType) => {
    factory.setStorageProvider(type);
    setConfig(factory.getConfig());
  };

  const handleAIChange = (type: AIProviderType) => {
    factory.setAIProvider(type);
    setConfig(factory.getConfig());
  };

  const handleQueueChange = (type: QueueProviderType) => {
    factory.setQueueProvider(type);
    setConfig(factory.getConfig());
  };

  return (
    <div className="space-y-6">
      {/* Title Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            <span>Universal Provider Factory & Infrastructure Adapters</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Decoupled Modular Monolith architecture: Switch database, storage, AI models, and event queues dynamically without code modifications.
          </p>
        </div>

        <button
          onClick={runHealthCheck}
          disabled={isPinging}
          className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 shadow-sm transition self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin text-indigo-400' : ''}`} />
          <span>Ping All Adapters</span>
        </button>
      </div>

      {/* Provider Matrix Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Database Provider */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2 text-cyan-400 font-bold">
              <Database className="w-4 h-4" />
              <span>Database (PostgreSQL / Prisma)</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] text-slate-400 font-semibold block">Active Adapter</label>
            <select
              value={config.dbProvider}
              onChange={(e) => handleDBChange(e.target.value as DBProviderType)}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white font-medium focus:outline-none focus:border-cyan-500"
            >
              <option value="neon">Neon Serverless Postgres</option>
              <option value="supabase">Supabase Postgres Pool</option>
              <option value="local">Local Docker PostgreSQL</option>
              <option value="memory">Fast In-Memory Engine</option>
            </select>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Pluggable relational storage abstraction with pooled connection management and dynamic failover fallback.
          </p>
        </div>

        {/* 2. Storage Provider */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <HardDrive className="w-4 h-4" />
              <span>Object Storage (S3 Universal)</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] text-slate-400 font-semibold block">Active Adapter</label>
            <select
              value={config.storageProvider}
              onChange={(e) => handleStorageChange(e.target.value as StorageProviderType)}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white font-medium focus:outline-none focus:border-amber-500"
            >
              <option value="cloudflare_r2">Cloudflare R2 (Zero Egress)</option>
              <option value="supabase_storage">Supabase Storage</option>
              <option value="minio">MinIO Self-Hosted S3</option>
              <option value="memory">Memory Buffer Store</option>
            </select>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Universal S3 API compatible file engine for encrypted vendor invoice PDFs and employee documents.
          </p>
        </div>

        {/* 3. AI Engine Provider */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2 text-purple-400 font-bold">
              <Sparkles className="w-4 h-4" />
              <span>AI OCR Engine</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] text-slate-400 font-semibold block">Active Adapter</label>
            <select
              value={config.aiProvider}
              onChange={(e) => handleAIChange(e.target.value as AIProviderType)}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white font-medium focus:outline-none focus:border-purple-500"
            >
              <option value="gemini">Google Gemini API (Official SDK)</option>
              <option value="groq">Groq Cloud (LPU Llama 3)</option>
              <option value="ollama">Ollama Local (On-Premise)</option>
              <option value="local_ocr">Deterministic Rule-Based OCR</option>
            </select>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Multimodal structured JSON schema extraction with confidence scoring and fallback routing.
          </p>
        </div>

        {/* 4. Queue / Event Bus Provider */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2 text-rose-400 font-bold">
              <Workflow className="w-4 h-4" />
              <span>Async Task & Event Bus</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] text-slate-400 font-semibold block">Active Adapter</label>
            <select
              value={config.queueProvider}
              onChange={(e) => handleQueueChange(e.target.value as QueueProviderType)}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white font-medium focus:outline-none focus:border-rose-500"
            >
              <option value="bullmq">BullMQ + Redis Event Engine</option>
              <option value="memory">In-Memory Async Event Bus</option>
            </select>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Asynchronous decoupled messaging for inter-module workflows (e.g. payroll to general ledger).
          </p>
        </div>
      </div>

      {/* Live Health Status Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>Active Adapters Health & Latency Telemetry</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
            All Adapters Operational
          </span>
        </div>

        <div className="space-y-2.5">
          {healths.map((h, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">{h.name}</span>
                  <span className="font-mono text-[10px] uppercase px-1.5 py-0.2 rounded bg-slate-700 text-slate-300">
                    {h.type}
                  </span>
                </div>
                <div className="text-slate-400 text-[11px]">{h.description}</div>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                {h.endpoint && (
                  <span className="text-[11px] font-mono text-slate-400 truncate max-w-xs hidden md:block">
                    {h.endpoint}
                  </span>
                )}
                <span className="font-mono text-cyan-400 font-semibold">{h.latencyMs} ms</span>
                <span className="flex items-center gap-1 text-emerald-400 font-semibold text-[11px] bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{h.status}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Architectural Decoupling Blueprint */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Code2 className="w-4 h-4 text-indigo-400" />
          <span>Modular Monolith Architectural Decoupling Principles</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2">
            <span className="font-bold text-white text-sm block">1. Domain Isolation</span>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              HRM and Accounting operate as independent bounded contexts. Cross-domain raw table joins are strictly forbidden; modules interact exclusively via typed service functions or the event bus.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2">
            <span className="font-bold text-white text-sm block">2. Event-Driven Sync</span>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              When payroll is finalized, an asynchronous <code className="text-indigo-300">hrm.payroll.finalized</code> event triggers the General Ledger posting worker without holding the HTTP response thread.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2">
            <span className="font-bold text-white text-sm block">3. Precision Math</span>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              All financial entries and payroll withholding calculations use <code className="text-indigo-300">decimal.js</code> for arbitrary-precision decimal arithmetic, eliminating IEEE-754 floating point rounding bugs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
