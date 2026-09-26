import { DBProviderType, StorageProviderType, AIProviderType, QueueProviderType, ProviderHealth } from '../types';

export type { ProviderHealth };

export interface IDatabaseProvider {
  type: DBProviderType;
  name: string;
  connect(): Promise<boolean>;
  checkHealth(): Promise<ProviderHealth>;
  disconnect(): Promise<void>;
}

export interface StorageUploadResult {
  url: string;
  key: string;
  size: number;
  mimeType: string;
  etag?: string;
}

export interface IStorageProvider {
  type: StorageProviderType;
  name: string;
  upload(fileData: string | Uint8Array, fileName: string, mimeType: string): Promise<StorageUploadResult>;
  getUrl(key: string): Promise<string>;
  delete(key: string): Promise<boolean>;
  checkHealth(): Promise<ProviderHealth>;
}

export interface AIExtractionLineItem {
  description: string;
  qty?: number;
  rate?: number;
  quantity?: number;
  unitPrice?: string | number;
  total: number | string;
  suggestedAccountCode?: string;
}

export interface AIExtractionResult {
  // Strict Standard Schema fields
  vendor: string;
  invoiceNumber: string;
  date: string;
  totalAmount: number | string;
  taxAmount: number | string;
  taxId: string;
  category: string;
  lineItems: AIExtractionLineItem[];
  confidenceScore: number;

  // Backward-compatibility and UI extensions
  vendorName?: string;
  merchantName?: string;
  vendorTaxId?: string;
  total?: number | string;
  tax?: number | string;
  subtotal?: string | number;
  subTotal?: string | number;
  invoiceDate?: string;
  transactionDate?: string;
  receiptNumber?: string;
  claimNumber?: string;
  dueDate?: string;
  poNumber?: string;
  currency?: string;
  taxRatePercent?: string;
  suggestedAccountCode?: string;
  suggestedAccountName?: string;
  notes?: string;
  rawJson?: string;
  isUnclear?: boolean;
  unclearReason?: string;
  unclearFields?: string[];
  fallbackUsed?: boolean;
  apiKeyNotice?: string;
}

export interface GeneratedInvoiceData {
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  clientTaxId?: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  currency: string;
  paymentTerms: string;
  poNumber?: string;
  lineItems: {
    description: string;
    quantity: number;
    unitPrice: string;
    total: string;
    revenueAccountCode?: string;
  }[];
  subtotal: string;
  taxRatePercent: string;
  taxAmount: string;
  totalAmount: string;
  notes?: string;
  bankWireDetails?: string;
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
