/**
 * Universal OCR & Document Payload Sanitizer
 * AUDMA OS Enterprise AI Pipeline
 */

export const SUPPORTED_OCR_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'image/svg+xml',
] as const;

export type SupportedOCRMimeType = (typeof SUPPORTED_OCR_MIME_TYPES)[number];

export interface SanitizedDocumentPayload {
  cleanBase64: string;
  mimeType: string;
  isBase64: boolean;
  dataUri: string;
  isPdf: boolean;
  isSvg: boolean;
}

export interface StandardOCRLineItem {
  description: string;
  qty: number;
  rate: number;
  total: number;
  quantity?: number;
  unitPrice?: string | number;
  suggestedAccountCode?: string;
}

export interface StandardOCRExtraction {
  // Strict Standard Schema fields
  vendor: string;
  invoiceNumber: string;
  date: string; // YYYY-MM-DD
  totalAmount: number;
  taxAmount: number;
  taxId: string;
  category: string;
  lineItems: StandardOCRLineItem[];
  confidenceScore: number;
  
  // Standard & Legacy field aliases
  vendorName: string;
  merchantName: string;
  vendorTaxId: string;
  total: number;
  tax: number;
  subtotal: number;
  subTotal: number;
  invoiceDate: string;
  transactionDate: string;
  receiptNumber: string;
  claimNumber: string;
  currency?: string;
  dueDate?: string;
  poNumber?: string;
  suggestedAccountCode?: string;
  suggestedAccountName?: string;
  notes?: string;
  isUnclear?: boolean;
  unclearReason?: string;
  unclearFields: string[];
  fallbackUsed?: boolean;
  apiKeyNotice?: string;
}

/**
 * Strips prefix metadata matching data:image/(png|jpeg|webp|svg+xml);base64, or data:application/pdf;base64,
 * and strips any whitespaces or invalid characters from the base64 string.
 */
export function stripBase64Header(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  let cleaned = input.trim();
  
  // Strip standard data: URI pattern
  const match = cleaned.match(/^data:(?:image\/(?:jpeg|png|webp|svg\+xml)|application\/pdf)(?:;charset=[^;]+)?;base64,(.*)$/is);
  if (match && match[1]) {
    cleaned = match[1];
  } else if (cleaned.includes('base64,')) {
    cleaned = cleaned.split('base64,')[1];
  }
  
  // Remove trailing and leading spaces, newlines, carriage returns
  return cleaned.replace(/\s+/g, '');
}

/**
 * Validates and detects standard MIME types from data URIs, file names, or explicit parameters
 */
export function detectMimeType(input: string, explicitMime?: string): string {
  if (explicitMime && explicitMime.trim()) {
    const norm = explicitMime.trim().toLowerCase().replace('image/jpg', 'image/jpeg');
    if (SUPPORTED_OCR_MIME_TYPES.includes(norm as any)) {
      return norm;
    }
  }

  if (typeof input === 'string' && input.startsWith('data:')) {
    const mimeMatch = input.match(/^data:([^;,]+)/i);
    if (mimeMatch && mimeMatch[1]) {
      const detected = mimeMatch[1].toLowerCase().replace('image/jpg', 'image/jpeg');
      if (SUPPORTED_OCR_MIME_TYPES.includes(detected as any)) {
        return detected;
      }
      return detected;
    }
  }

  return 'image/jpeg';
}

/**
 * Pure base64 string sanitizer for frontend components and backend handlers
 */
export function sanitizeDocumentPayload(
  input: string,
  explicitMime?: string
): SanitizedDocumentPayload {
  if (!input || typeof input !== 'string') {
    return {
      cleanBase64: '',
      mimeType: 'image/jpeg',
      isBase64: false,
      dataUri: '',
      isPdf: false,
      isSvg: false,
    };
  }

  const isDataUri = input.startsWith('data:');
  const isSvgText = input.includes('<svg') || explicitMime === 'image/svg+xml';
  const mimeType = detectMimeType(input, explicitMime);
  const isPdf = mimeType === 'application/pdf';
  const isSvg = isSvgText || mimeType === 'image/svg+xml';

  const cleanBase64 = stripBase64Header(input);
  const isBase64 = cleanBase64.length > 0 && !isSvgText;
  const dataUri = isDataUri ? input : isBase64 ? `data:${mimeType};base64,${cleanBase64}` : input;

  return {
    cleanBase64,
    mimeType,
    isBase64,
    dataUri,
    isPdf,
    isSvg,
  };
}

/**
 * Extracts a valid JSON block from a string using regex pattern matching.
 * Removes markdown fences (```json ... ```) or conversational wrappers.
 */
export function extractJsonBlock(text: string): string {
  if (!text || typeof text !== 'string') return '';
  
  // Remove markdown code fence markers first
  let cleaned = text.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
  
  // Match innermost or outermost JSON object
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0].trim();
  }
  
  return cleaned;
}

/**
 * Bulletproof JSON cleaner and parser with defensive fallbacks
 */
export function cleanAndParseJson<T = any>(input: any, fallback?: T): T | null {
  if (input === null || input === undefined) {
    return fallback !== undefined ? fallback : null;
  }
  if (typeof input === 'object') {
    return input as T;
  }
  if (typeof input !== 'string') {
    return fallback !== undefined ? fallback : null;
  }

  const jsonString = extractJsonBlock(input);
  if (!jsonString) {
    return fallback !== undefined ? fallback : null;
  }

  try {
    return JSON.parse(jsonString) as T;
  } catch {
    try {
      // Clean possible unescaped newlines or trailing commas
      const sanitized = jsonString
        .replace(/,\s*([\]}])/g, '$1')
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
      return JSON.parse(sanitized) as T;
    } catch {
      return fallback !== undefined ? fallback : null;
    }
  }
}

/**
 * Defensive number parser defaulting to 0 or a specified fallback
 */
export function parseDefensiveNumber(val: any, fallback = 0): number {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'number') return isNaN(val) ? fallback : Number(val.toFixed(2));
  if (typeof val === 'string') {
    const cleaned = val.replace(/[^0-9.-]/g, '');
    if (!cleaned) return fallback;
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? fallback : Number(parsed.toFixed(2));
  }
  return fallback;
}

/**
 * Standardizes raw OCR JSON into the required strict schema with backward-compatible aliases
 */
export function normalizeStandardOCRExtraction(rawInput: any): StandardOCRExtraction {
  let raw = rawInput;
  if (typeof raw === 'string') {
    raw = cleanAndParseJson(raw, {}) || {};
  }
  if (!raw || typeof raw !== 'object') {
    raw = {};
  }

  const vendor = (
    raw.vendor ||
    raw.vendorName ||
    raw.merchantName ||
    raw.supplier ||
    raw.merchant ||
    raw.clientName ||
    'Operational Vendor'
  ).toString().trim();

  const invoiceNumber = (
    raw.invoiceNumber ||
    raw.invoiceNum ||
    raw.receiptNumber ||
    raw.claimNumber ||
    raw.voucherNumber ||
    raw.invoice_number ||
    raw.receipt_number ||
    `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
  ).toString().trim();

  const date = (
    raw.date ||
    raw.invoiceDate ||
    raw.transactionDate ||
    raw.receiptDate ||
    raw.invoice_date ||
    raw.transaction_date ||
    new Date().toISOString().split('T')[0]
  ).toString().trim();

  const totalAmount = parseDefensiveNumber(
    raw.totalAmount ?? raw.total ?? raw.grandTotal ?? raw.total_amount ?? raw.amountDue ?? raw.balanceDue ?? raw.amount,
    0
  );

  const taxAmount = parseDefensiveNumber(
    raw.taxAmount ?? raw.tax ?? raw.vatAmount ?? raw.tax_amount ?? raw.vat,
    0
  );

  const subtotal = parseDefensiveNumber(
    raw.subtotal ?? raw.subTotal ?? raw.sub_total ?? raw.netAmount,
    Math.max(0, Number((totalAmount - taxAmount).toFixed(2)))
  );

  const taxId = (
    raw.taxId ||
    raw.vendorTaxId ||
    raw.vatNumber ||
    raw.taxID ||
    raw.tax_id ||
    raw.tin ||
    ''
  ).toString().trim();

  const category = (raw.category || 'OFFICE_SUPPLIES').toString().trim();
  const confidenceScore = typeof raw.confidenceScore === 'number'
    ? raw.confidenceScore
    : typeof raw.confidence_score === 'number'
    ? raw.confidence_score
    : 0.95;

  // Standardize Line Items
  const rawItems = Array.isArray(raw.lineItems)
    ? raw.lineItems
    : Array.isArray(raw.items)
    ? raw.items
    : Array.isArray(raw.line_items)
    ? raw.line_items
    : [];

  const lineItems: StandardOCRLineItem[] = rawItems.map((item: any) => {
    if (!item || typeof item !== 'object') {
      return {
        description: 'Expense item',
        qty: 1,
        quantity: 1,
        rate: 0,
        unitPrice: '0.00',
        total: 0,
      };
    }
    const qty = parseDefensiveNumber(item.qty ?? item.quantity ?? item.count, 1) || 1;
    const rate = parseDefensiveNumber(item.rate ?? item.unitPrice ?? item.unit_price ?? item.price, 0);
    const total = parseDefensiveNumber(item.total ?? item.amount, qty * rate);
    return {
      description: (item.description || item.name || item.item || 'Expense Item').toString().trim(),
      qty,
      quantity: qty,
      rate,
      unitPrice: rate.toFixed(2),
      total: total || (qty * rate),
      suggestedAccountCode: item.suggestedAccountCode || raw.suggestedAccountCode || undefined,
    };
  });

  const unclearFields: string[] = Array.isArray(raw.unclearFields)
    ? raw.unclearFields
    : Array.isArray(raw.unclear_fields)
    ? raw.unclear_fields
    : [];

  const missingVendor = !vendor || vendor.length === 0 || /unknown|unclear|unreadable/i.test(vendor);
  const missingTotal = totalAmount <= 0;
  const isUnclear = Boolean(raw.isUnclear || raw.is_unclear || missingVendor || missingTotal);

  if (missingVendor && !unclearFields.includes('vendor') && !unclearFields.includes('vendorName') && !unclearFields.includes('merchantName')) {
    unclearFields.push('vendor');
  }
  if (missingTotal && !unclearFields.includes('totalAmount') && !unclearFields.includes('total')) {
    unclearFields.push('totalAmount');
  }

  return {
    // Strict schema fields
    vendor,
    invoiceNumber,
    date,
    totalAmount,
    taxAmount,
    taxId,
    category,
    lineItems,
    confidenceScore,
    // Aliases
    vendorName: vendor,
    merchantName: vendor,
    vendorTaxId: taxId,
    total: totalAmount,
    tax: taxAmount,
    subtotal,
    subTotal: subtotal,
    invoiceDate: date,
    transactionDate: date,
    receiptNumber: invoiceNumber,
    claimNumber: invoiceNumber,
    currency: raw.currency || 'USD',
    dueDate: raw.dueDate || raw.due_date || date,
    poNumber: raw.poNumber || raw.po_number || '',
    suggestedAccountCode: raw.suggestedAccountCode || raw.suggested_account_code || '5450',
    suggestedAccountName: raw.suggestedAccountName || raw.suggested_account_name,
    notes: raw.notes || '',
    isUnclear,
    unclearReason:
      raw.unclearReason ||
      raw.unclear_reason ||
      (isUnclear ? "We couldn't clearly read the Total Amount or Vendor Name. Please verify the document is flat and well-lit." : ''),
    unclearFields,
    fallbackUsed: Boolean(raw.fallbackUsed),
    apiKeyNotice: raw.apiKeyNotice,
  };
}
