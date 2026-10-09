# AUDMA OS - HTTP API Reference & Schema Specification

## 1. Overview & Base URL

The AUDMA OS backend is powered by Express 4 in `server.ts` and handles document perception, OCR extraction, AI billing, and system health checks.

- **Development Port**: `3000`
- **Base URL**: `http://localhost:3000` (or the deployed Cloud Run service URL)
- **Content-Type**: `application/json`
- **Request Body Limit**: `50MB` (supporting high-resolution scans and multi-page PDFs)

---

## 2. API Endpoints

### 2.1 Health Check
Returns the current application status, runtime timestamp, and supported AI provider drivers.

- **Endpoint**: `GET /api/health`
- **Authentication**: None (Public health probe)
- **Response**: `200 OK`
```json
{
  "status": "ok",
  "app": "AUDMA OS Enterprise Monolith",
  "timestamp": "2026-10-09T22:58:00.000Z",
  "version": "2.0.0",
  "providers": ["gemini", "groq", "openai", "ollama", "claude", "deepseek", "local_ocr"]
}
```

---

### 2.2 Extract AP Invoice OCR
Performs deep OCR and accounting field extraction on an uploaded vendor invoice document or text payload.

- **Endpoint**: `POST /api/ai/extract-invoice`
- **Request Body**:
```json
{
  "content": "data:image/jpeg;base64,...",
  "mimeType": "image/jpeg",
  "provider": "gemini"
}
```

#### Request Parameters:
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `content` | string | Yes | Base64-encoded image/PDF data URI or raw text invoice content. |
| `mimeType` | string | Optional | MIME type of content (e.g. `image/jpeg`, `image/png`, `application/pdf`). |
| `provider` | string | Optional | Target AI provider (`gemini`, `groq`, `ollama`, `local_ocr`). Defaults to `gemini`. |

#### Response (`200 OK`):
```json
{
  "vendorName": "Amazon Web Services, Inc.",
  "vendorTaxId": "US-94-3129841",
  "invoiceNumber": "AWS-2026-98124",
  "invoiceDate": "2026-10-01",
  "dueDate": "2026-10-31",
  "poNumber": "PO-8812",
  "currency": "USD",
  "subtotal": "4000.00",
  "taxRatePercent": "5.0",
  "taxAmount": "200.00",
  "totalAmount": "4200.00",
  "confidenceScore": 0.98,
  "isUnclear": false,
  "unclearReason": "",
  "unclearFields": [],
  "lineItems": [
    {
      "description": "EC2 Compute Instances & Cloud Hosting",
      "quantity": 1,
      "unitPrice": "4000.00",
      "total": "4000.00",
      "suggestedAccountCode": "5200"
    }
  ]
}
```

---

### 2.3 Extract Receipt & Daily Expense
Analyzes a photographed receipt slip, determines tax and totals, evaluates image clarity, and automatically maps the merchant to standard General Ledger expense codes.

- **Endpoint**: `POST /api/ai/extract-receipt`
- **Request Body**:
```json
{
  "content": "data:image/jpeg;base64,...",
  "mimeType": "image/jpeg",
  "provider": "gemini"
}
```

#### Response (`200 OK`):
```json
{
  "merchantName": "Shell Fuel & Fleet Service",
  "transactionDate": "2026-10-09",
  "currency": "USD",
  "subtotal": "64.20",
  "taxAmount": "4.80",
  "totalAmount": "69.00",
  "category": "FUEL_LOGISTICS",
  "suggestedAccountCode": "5250",
  "suggestedAccountName": "Vehicle Fuel & Fleet Logistics Expense",
  "confidenceScore": 0.96,
  "isUnclear": false,
  "notes": "Diesel refueling for regional distribution van"
}
```

#### Suggested GL Account Mappings:
| Merchant Category | Code | Account Title |
| :--- | :--- | :--- |
| Gas, Fuel & Fleet | `5250` | Vehicle Fuel & Fleet Logistics Expense |
| Meals, Restaurants & Cafes | `5350` | Travel, Meals & Entertainment Expense |
| Office Stationery & Retail | `5450` | Office Supplies & Consumables Expense |
| Cloud, Hosting & SaaS | `5200` | Cloud & Hosting Infrastructure Expense |
| General Administrative | `5500` | Office Facilities & General Administrative |

---

### 2.4 Prompt-Driven Outbound Invoice Generator
Generates a structured, professional outbound sales invoice from natural language instructions or a photographed job order.

- **Endpoint**: `POST /api/ai/generate-invoice`
- **Request Body**:
```json
{
  "prompt": "Bill Acme Corp for 40 hours of Senior Architecture Consulting at $175/hr and $500 cloud setup fee, Net 30",
  "provider": "gemini"
}
```

#### Response (`200 OK`):
```json
{
  "clientName": "Acme Corp",
  "clientEmail": "billing@acmecorp.com",
  "clientAddress": "100 Market St, San Francisco, CA 94105",
  "clientTaxId": "US-82-991283",
  "invoiceNumber": "INV-2026-3001",
  "invoiceDate": "2026-10-09",
  "dueDate": "2026-11-08",
  "currency": "USD",
  "paymentTerms": "Net 30 Days",
  "lineItems": [
    {
      "description": "Senior Architecture Consulting (40 hrs)",
      "quantity": 40,
      "unitPrice": "175.00",
      "total": "7000.00",
      "revenueAccountCode": "4020"
    },
    {
      "description": "Cloud Environment Setup Fee",
      "quantity": 1,
      "unitPrice": "500.00",
      "total": "500.00",
      "revenueAccountCode": "4020"
    }
  ],
  "subtotal": "7500.00",
  "taxRatePercent": "0.0",
  "taxAmount": "0.00",
  "totalAmount": "7500.00",
  "notes": "Payment due within 30 days of invoice date.",
  "bankWireDetails": "AUDMA Enterprise Operating Account - Wire Routing: 121000358, Acct: 994820194"
}
```

---

## 3. Error Handling & Status Codes

| Code | Status | Meaning |
| :--- | :--- | :--- |
| `200` | OK | Request processed successfully. |
| `400` | Bad Request | Missing required parameters (e.g. `content` or `prompt`). |
| `500` | Internal Server Error | Exception during LLM inference or document processing. |

### Error Response Schema:
```json
{
  "error": "Document payload or image content is required"
}
```
In cases where an external AI API fails or is unreachable, the endpoints fall back to deterministic mock generators to keep the application responsive.
