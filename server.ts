import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import session from 'express-session';
import type { Store as SessionStore } from 'express-session';
import pgSession from 'connect-pg-simple';
import helmet from 'helmet';
import cors from 'cors';
import { Pool } from 'pg';
import pinoHttp from 'pino-http';
import {
  getServerAIProvider,
  SERVER_AI_PROVIDERS,
  validateAIRequest,
} from './src/lib/ai-request';
import {
  AIProviderError,
  CircuitBreaker,
  FixedWindowRateLimiter,
  runWithAIResilience,
} from './src/lib/ai-resilience';
import { logger } from './src/lib/logger';
import {
  authRateLimiter,
  apiRateLimiter,
  getClientIp,
} from './src/middleware/rate-limit';
import {
  validateBody,
  LoginSchema,
  ChangePasswordSchema,
  RegisterSchema,
  PasswordResetRequestSchema,
  PasswordResetConfirmSchema,
  CreateAccountSchema,
  CreateJournalEntrySchema,
  CreateVendorSchema,
  CreateInvoiceSchema,
  UpdateInvoiceStatusSchema,
  CreateDepartmentSchema,
  CreateEmployeeSchema,
  UpdateEmployeeSchema,
  RecordAttendanceSchema,
  CreateLeaveRequestSchema,
  UpdateLeaveStatusSchema,
  CreatePayrollRunSchema,
  CreatePayrollRecordSchema,
  CreateReceiptSchema,
  UpdateReceiptStatusSchema,
} from './src/lib/validation';
import {
  checkDatabaseConnection,
  closeDatabasePool,
  getDatabasePool,
} from './src/lib/database';
import {
  hashPassword,
  authenticateUser,
  findUserById,
  verifyPassword,
  generateSessionSecret,
} from './src/lib/auth';
import {
  getDbPool,
  dbIsHealthy,
  closeDbPool,
} from './src/lib/db/pool';
import {
  AccountingRepository,
  HRMRepository,
  ReceiptRepository,
  AuthRepository,
} from './src/lib/db/repositories';
import {
  requireAuth,
  optionalAuth,
  setSessionUser,
  clearSessionUser,
  requirePermissions,
  requireRole,
  requireAnyPermission,
  AuthenticatedRequest,
} from './src/middleware/auth';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';

// ============================================================================
// Structured Request Logging (Pino)
// ============================================================================
app.use(
  pinoHttp({
    logger,
    redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers.set-cookie'],
    serializers: {
      req: (req: any) => ({
        id: req.id,
        method: req.method,
        url: req.url,
        ip: req.ip,
        user: (req as any).user?.id || 'anonymous',
      }),
      res: (res: any) => ({
        statusCode: res.statusCode,
      }),
    },
  })
);

// ============================================================================
// Database Pool (PostgreSQL for sessions + future persistence)
// ============================================================================
const pgPool = getDatabasePool(); // May be undefined if no DATABASE_URL

// ============================================================================
// Session Store (PostgreSQL in production, memory in dev)
// ============================================================================
const PostgreSQLStore = pgSession(session);

let sessionStore: SessionStore | undefined;
if (pgPool) {
  sessionStore = new PostgreSQLStore({
    pool: pgPool,
    tableName: 'user_sessions',
    createTableIfMissing: true,
    pruneSessionInterval: 60 * 60, // 1 hour
  });
}

// Session configuration
const sessionConfig: session.SessionOptions = {
  secret: process.env.SESSION_SECRET || generateSessionSecret(),
  name: 'audma_session', // non-default cookie name to avoid targeted attacks
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: IS_PRODUCTION, // HTTPS only in production
    sameSite: IS_PRODUCTION ? 'strict' : 'lax',
    maxAge: 1000 * 60 * 60 * 8, // 8 hours
    domain: process.env.SESSION_COOKIE_DOMAIN || undefined,
  },
  rolling: true, // reset expiry on activity
};

app.use(session(sessionConfig));

// ============================================================================
// Security Middleware
// ============================================================================
app.use(
  helmet({
    contentSecurityPolicy: IS_PRODUCTION
      ? {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'", 'http://localhost:11434', 'https:'],
          },
        }
      : false,
  })
);

app.use(
  cors({
    origin: process.env.APP_URL || (IS_PRODUCTION ? undefined : 'http://localhost:3000'),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ============================================================================
// AI Rate Limiting & Circuit Breakers (applied to /api/ai)
// ============================================================================
const aiRateLimiter = new FixedWindowRateLimiter(20, 60_000);
const aiCircuitBreakers = new Map(
  SERVER_AI_PROVIDERS.map((provider) => [provider, new CircuitBreaker()])
);

app.use('/api/ai', (req, res, next) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const result = aiRateLimiter.consume(ip);
  if (!result.allowed) {
    res.setHeader('Retry-After', String(Math.ceil(result.retryAfterMs / 1_000)));
    return res.status(429).json({
      code: 'AI_RATE_LIMITED',
      error: 'AI request limit reached. Try again later.',
    });
  }
  next();
});

// ============================================================================
// Universal Multi-LLM Handler (unchanged core logic)
// ============================================================================
let geminiClient: any = null;
function getGeminiClient(): any {
  if (
    !geminiClient &&
    process.env.GEMINI_API_KEY &&
    process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY' &&
    process.env.GEMINI_API_KEY.trim().length > 0
  ) {
    const { GoogleGenAI } = require('@google/genai');
    geminiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        timeout: 30_000,
        retryOptions: { attempts: 1 },
        headers: { 'User-Agent': 'audma-os-production' },
      },
    });
  }
  return geminiClient;
}

async function callUniversalLLM(
  provider: string,
  systemPrompt: string,
  userPrompt: string,
  base64Image?: { mimeType: string; data: string }
): Promise<string | null> {
  const p = (provider || 'ollama').toLowerCase();

  // Groq API (OpenAI Compatible)
  if (p === 'groq') {
    const apiKey = process.env.GROQ_API_KEY;
    if (apiKey) {
      const messages: any[] = [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: base64Image
            ? [
                { type: 'text', text: userPrompt },
                {
                  type: 'image_url',
                  image_url: { url: `data:${base64Image.mimeType};base64,${base64Image.data}` },
                },
              ]
            : userPrompt,
        },
      ];
      const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        signal: AbortSignal.timeout(30_000),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: base64Image ? 'llama-3.2-11b-vision-preview' : 'llama-3.3-70b-versatile',
          messages,
          temperature: 0.1,
          response_format: { type: 'json_object' },
        }),
      });
      if (resp.ok) {
        const json = await resp.json();
        return json.choices?.[0]?.message?.content || null;
      }
      throw new AIProviderError(
        `Groq request failed (${resp.status})`,
        isTransientHTTPStatus(resp.status),
        resp.status
      );
    }
  }

  // OpenAI API
  if (p === 'openai') {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      const messages: any[] = [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: base64Image
            ? [
                { type: 'text', text: userPrompt },
                {
                  type: 'image_url',
                  image_url: { url: `data:${base64Image.mimeType};base64,${base64Image.data}` },
                },
              ]
            : userPrompt,
        },
      ];
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        signal: AbortSignal.timeout(30_000),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages,
          temperature: 0.1,
          response_format: { type: 'json_object' },
        }),
      });
      if (resp.ok) {
        const json = await resp.json();
        return json.choices?.[0]?.message?.content || null;
      }
      throw new AIProviderError(
        `OpenAI request failed (${resp.status})`,
        isTransientHTTPStatus(resp.status),
        resp.status
      );
    }
  }

  // Ollama (Local on-premise vision inference)
  if (p === 'ollama') {
    const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    const resp = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      signal: AbortSignal.timeout(30_000),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2-vision',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: userPrompt,
            images: base64Image ? [base64Image.data] : undefined,
          },
        ],
        stream: false,
        format: 'json',
      }),
    });
    if (resp.ok) {
      const json = await resp.json();
      return json.message?.content || null;
    }
    throw new AIProviderError(
      `Ollama request failed (${resp.status})`,
      isTransientHTTPStatus(resp.status),
      resp.status
    );
  }

  if (p !== 'gemini') return null;

  // Default to Gemini API via @google/genai
  const gemini = getGeminiClient();
  if (gemini) {
    let contentsPayload: any;
    if (base64Image) {
      contentsPayload = {
        parts: [
          {
            inlineData: {
              mimeType: base64Image.mimeType,
              data: base64Image.data,
            },
          },
          { text: `${systemPrompt}\n\n${userPrompt}` },
        ],
      };
    } else {
      contentsPayload = `${systemPrompt}\n\n${userPrompt}`;
    }

    const response = await gemini.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: contentsPayload,
      config: { responseMimeType: 'application/json' },
    });

    return response.text || null;
  }

  return null;
}

function isTransientHTTPStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

function isTransientProviderError(error: unknown): boolean {
  if (error instanceof AIProviderError) return error.retryable;
  if (error instanceof TypeError || (error instanceof Error && ['AbortError', 'TimeoutError'].includes(error.name))) {
    return true;
  }
  if (error && typeof error === 'object' && 'status' in error && typeof error.status === 'number') {
    return isTransientHTTPStatus(error.status);
  }
  return false;
}

function callAIWithResilience(
  provider: string,
  systemPrompt: string,
  userPrompt: string,
  base64Image?: { mimeType: string; data: string }
): Promise<string> {
  const circuitBreaker = aiCircuitBreakers.get(
    provider as (typeof SERVER_AI_PROVIDERS)[number]
  );
  if (!circuitBreaker) throw new AIProviderError('Unsupported AI provider', false);
  return runWithAIResilience(
    circuitBreaker,
    () => callUniversalLLM(provider, systemPrompt, userPrompt, base64Image),
    { attempts: 4, initialDelayMs: 250, isRetryable: isTransientProviderError }
  );
}

// ============================================================================
// Authentication Routes
// ============================================================================

/** POST /api/auth/login — authenticate with email + password, create session */
app.post(
  '/api/auth/login',
  authRateLimiter.middleware({
    identifierExtractor: getClientIp,
  }),
  validateBody(LoginSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { email, password } = req.validatedBody as { email: string; password: string };

      if (!pgPool) {
        return res.status(503).json({
          code: 'DATABASE_UNAVAILABLE',
          error: 'Authentication database is not configured.',
        });
      }

      const user = await authenticateUser(pgPool, email, password);
      if (!user) {
        // Generic message to prevent user enumeration
        return res.status(401).json({
          code: 'INVALID_CREDENTIALS',
          error: 'Invalid email or password.',
        });
      }

      // Update last login
      await pgPool.query('UPDATE users SET last_login_at = now() WHERE id = $1', [user.id]);

      // Create session
      setSessionUser(req, user);

      // Regenerate session to prevent session fixation
      await new Promise<void>((resolve, reject) => {
        (req as any).session.regenerate((err: unknown) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Re-attach user after regenerate
      setSessionUser(req, user);
      await new Promise<void>((resolve, reject) => {
        (req as any).session.save((err: unknown) => {
          if (err) reject(err);
          else resolve();
        });
      });

      logger.info({ userId: user.id, email }, 'User login successful');

      return res.json({
        code: 'OK',
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          permissions: user.permissions,
        },
      });
    } catch (error: any) {
      logger.error({ err: error }, 'Login error');
      res.status(500).json({ code: 'LOGIN_FAILED', error: error.message || 'Login failed' });
    }
  }
);

/** POST /api/auth/logout — destroy session */
app.post('/api/auth/logout', (req, res) => {
  clearSessionUser(req as AuthenticatedRequest);
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ code: 'LOGOUT_FAILED', error: 'Logout failed.' });
    }
    res.clearCookie('audma_session');
    res.json({ code: 'OK', message: 'Logged out.' });
  });
});

/** GET /api/auth/me — get current session user */
app.get('/api/auth/me', optionalAuth, (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ code: 'UNAUTHENTICATED', error: 'No active session.' });
  }
  res.json({
    code: 'OK',
    user: {
      id: req.user.id,
      email: req.user.email,
      full_name: req.user.full_name,
      role: req.user.role,
      permissions: req.user.permissions,
    },
  });
});

/** POST /api/auth/register — create a new user (SUPER_ADMIN only) */
app.post(
  '/api/auth/register',
  requireAuth,
  requireRole('SUPER_ADMIN'),
  authRateLimiter.middleware({
    identifierExtractor: getClientIp,
  }),
  validateBody(RegisterSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { email, password, full_name, role } = req.validatedBody as {
        email: string;
        password: string;
        full_name: string;
        role: string;
      };

      if (!pgPool) {
        return res.status(503).json({
          code: 'DATABASE_UNAVAILABLE',
          error: 'User database is not configured.',
        });
      }

      // Check if user already exists
      const existing = await pgPool.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [
        email,
      ]);
      if (existing.rows.length > 0) {
        return res.status(409).json({
          code: 'USER_EXISTS',
          error: 'A user with this email already exists.',
        });
      }

      const passwordHash = await hashPassword(password);

      // Get or create default organization
      let orgResult = await pgPool.query("SELECT id FROM organizations LIMIT 1");
      let orgId: string;
      if (orgResult.rows.length === 0) {
        const ins = await pgPool.query(
          'INSERT INTO organizations (name) VALUES ($1) RETURNING id',
          ['Audma Enterprise']
        );
        orgId = ins.rows[0].id;
      } else {
        orgId = orgResult.rows[0].id;
      }

      const userResult = await pgPool.query(
        `INSERT INTO users (oidc_subject, email, full_name, password_hash, email_verified, is_active)
         VALUES ($1, $2, $3, $4, true, true)
         RETURNING id`,
        [`oidc-${Date.now()}`, email.toLowerCase(), full_name, passwordHash]
      );
      const userId = userResult.rows[0].id;

      await pgPool.query(
        'INSERT INTO organization_memberships (organization_id, user_id, role_key, is_active) VALUES ($1, $2, $3, true)',
        [orgId, userId, role]
      );

      logger.info({ userId, email, role, createdBy: req.user?.id }, 'User registered');

      return res.status(201).json({
        code: 'USER_CREATED',
        user: { id: userId, email, full_name, role },
      });
    } catch (error: any) {
      logger.error({ err: error }, 'Register error');
      res.status(500).json({ code: 'REGISTER_FAILED', error: error.message || 'Registration failed' });
    }
  }
);

/** POST /api/auth/change-password — change own password (authenticated users) */
app.post(
  '/api/auth/change-password',
  requireAuth,
  authRateLimiter.middleware({
    identifierExtractor: getClientIp,
  }),
  validateBody(ChangePasswordSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { current_password, new_password } = req.validatedBody as {
        current_password: string;
        new_password: string;
      };

      if (!req.user) {
        return res.status(401).json({ code: 'UNAUTHENTICATED', error: 'Login required.' });
      }

      if (!pgPool) {
        return res.status(503).json({ code: 'DATABASE_UNAVAILABLE', error: 'Database not configured.' });
      }

      const user = await findUserById(pgPool, req.user.id);
      if (!user || !user.password_hash) {
        return res.status(400).json({ code: 'NO_PASSWORD_SET', error: 'This account does not use password authentication.' });
      }

      const valid = await verifyPassword(current_password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ code: 'INVALID_CREDENTIALS', error: 'Current password is incorrect.' });
      }

      const newHash = await hashPassword(new_password);
      await pgPool.query(
        'UPDATE users SET password_hash = $1, password_changed_at = now() WHERE id = $2',
        [newHash, req.user.id]
      );

      logger.info({ userId: req.user.id }, 'Password changed');

      res.json({ code: 'PASSWORD_CHANGED', message: 'Password changed successfully.' });
    } catch (error: any) {
      logger.error({ err: error }, 'Change password error');
      res.status(500).json({ code: 'PASSWORD_CHANGE_FAILED', error: error.message || 'Password change failed' });
    }
  }
);

/** POST /api/auth/password-reset/request — request a password reset token */
app.post(
  '/api/auth/password-reset/request',
  authRateLimiter.middleware({
    identifierExtractor: getClientIp,
  }),
  validateBody(PasswordResetRequestSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { email } = req.validatedBody as { email: string };

      if (!pgPool) {
        return res.status(503).json({
          code: 'DATABASE_UNAVAILABLE',
          error: 'Database not configured.',
        });
      }

      const user = await pgPool.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [
        email,
      ]);

      // Always return OK to prevent user enumeration
      if (user.rows.length > 0) {
        logger.info({ email, userId: user.rows[0].id }, 'Password reset requested');
      }

      res.json({
        code: 'OK',
        message: 'If an account exists with this email, a reset link has been sent.',
      });
    } catch (error: any) {
      logger.error({ err: error }, 'Password reset request error');
      res.status(500).json({
        code: 'PASSWORD_RESET_FAILED',
        error: error.message || 'Password reset request failed',
      });
    }
  }
);

/** POST /api/auth/password-reset/confirm — confirm password reset with token */
app.post(
  '/api/auth/password-reset/confirm',
  authRateLimiter.middleware({
    identifierExtractor: getClientIp,
  }),
  validateBody(PasswordResetConfirmSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { token, new_password } = req.validatedBody as {
        token: string;
        new_password: string;
      };

      if (!pgPool) {
        return res.status(503).json({
          code: 'DATABASE_UNAVAILABLE',
          error: 'Database not configured.',
        });
      }

      res.status(501).json({
        code: 'NOT_IMPLEMENTED',
        error: 'Email-based password reset requires SMTP configuration. Contact support.',
      });
    } catch (error: any) {
      logger.error({ err: error }, 'Password reset confirm error');
      res.status(500).json({
        code: 'PASSWORD_RESET_FAILED',
        error: error.message || 'Password reset failed',
      });
    }
  }
);

/** GET /api/auth/oidc/callback — OIDC/OAuth2 callback (placeholder) */
app.get('/api/auth/oidc/callback', async (req, res) => {
  res.status(501).json({
    code: 'NOT_IMPLEMENTED',
    error: 'OIDC/OAuth2 integration requires provider configuration (Google, Microsoft, Okta, etc.)',
  });
});

// ============================================================================
// API Health
// ============================================================================

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    app: 'AUDMA OS Enterprise Monolith',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    environment: NODE_ENV,
    providers: SERVER_AI_PROVIDERS,
    database: pgPool ? 'configured' : 'not_configured',
  });
});

app.get('/api/health/database', async (req, res) => {
  const database = await checkDatabaseConnection();
  res.status(database.healthy ? 200 : 503).json({
    status: database.healthy ? 'healthy' : 'unavailable',
    latencyMs: database.latencyMs,
  });
});

app.get('/api/ready', async (req, res) => {
  const database = await checkDatabaseConnection();
  const ready = IS_PRODUCTION ? database.healthy : true;
  res.status(ready ? 200 : 503).json({
    status: ready ? 'ready' : 'not_ready',
    database: database.healthy ? 'healthy' : 'unavailable',
    databaseLatencyMs: database.latencyMs,
    workflowPersistence: pgPool ? 'postgresql' : 'in_memory',
    authentication: pgPool ? 'postgresql' : 'disabled',
  });
});

// ============================================================================
// AI Invoice Extraction Endpoint (Protected)
// ============================================================================
app.post('/api/ai/extract-invoice', requireAuth, async (req, res) => {
  try {
    const validationError = validateAIRequest(req.body, 'extract');
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }
    const { content, mimeType } = req.body;
    const provider = getServerAIProvider(req.body.provider);

    const isImageOrPdf =
      content.startsWith('data:') ||
      mimeType?.startsWith('image/') ||
      mimeType === 'application/pdf';

    let base64Obj: { mimeType: string; data: string } | undefined;
    if (isImageOrPdf) {
      const data = content.includes(',') ? content.split(',')[1] : content;
      base64Obj = { mimeType: mimeType || 'image/jpeg', data };
    }

    const systemPrompt = `You are an expert enterprise AP invoice OCR accountant. Extract invoice fields with extreme accuracy.
Evaluate the visual clarity of the document.
If the document image is blurry, corrupted, unreadable, cut off, or missing crucial data (such as missing total amount or vendor name), mark "isUnclear": true and list the missing/unclear fields in "unclearFields" (e.g. ["totalAmount", "vendorName"]) and describe the issue in "unclearReason".
Always return strict valid JSON matching this schema:
{
  "vendorName": string,
  "vendorTaxId": string,
  "invoiceNumber": string,
  "invoiceDate": string (YYYY-MM-DD),
  "dueDate": string (YYYY-MM-DD),
  "poNumber": string,
  "currency": string (e.g. "USD"),
  "subtotal": string (decimal, e.g. "5000.00"),
  "taxRatePercent": string,
  "taxAmount": string (decimal, e.g. "250.00"),
  "totalAmount": string (decimal, e.g. "5250.00"),
  "confidenceScore": number (0.0 to 1.0),
  "isUnclear": boolean,
  "unclearReason": string,
  "unclearFields": string[],
  "lineItems": [
    {
      "description": string,
      "quantity": number,
      "unitPrice": string,
      "total": string,
      "suggestedAccountCode": string (e.g. "5200" for software/cloud, "1500" for hardware/equipment, "5300" for freight/logistics, "5400" for services)
    }
  ]
}`;

    const userPrompt = isImageOrPdf
      ? 'Perform deep OCR analysis on this invoice document. Extract all line items, tax breakdown, dates, vendor details, and evaluate clarity.'
      : `Analyze the following raw invoice text and extract all structured fields:\n\n${content}`;

    try {
      const rawOutput = await callAIWithResilience(provider, systemPrompt, userPrompt, base64Obj);
      if (rawOutput) {
        const cleaned = rawOutput.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(cleaned);

        const missingVendor =
          !parsed.vendorName ||
          parsed.vendorName.trim().length === 0 ||
          /unknown|unclear|unreadable/i.test(parsed.vendorName);
        const missingTotal =
          !parsed.totalAmount ||
          parsed.totalAmount === '0.00' ||
          parsed.totalAmount === '0' ||
          isNaN(parseFloat(parsed.totalAmount));

        if (missingVendor || missingTotal) {
          parsed.isUnclear = true;
          parsed.unclearFields = parsed.unclearFields || [];
          if (missingVendor && !parsed.unclearFields.includes('vendorName')) parsed.unclearFields.push('vendorName');
          if (missingTotal && !parsed.unclearFields.includes('totalAmount')) parsed.unclearFields.push('totalAmount');
          parsed.unclearReason =
            parsed.unclearReason ||
            "We couldn't clearly read the Total Amount or Vendor Name. Please verify the document is flat and well-lit.";
        }

        return res.json(parsed);
      }
    } catch (llmErr) {
      console.warn(`LLM extraction via ${provider} failed:`, llmErr);
    }

    return res.status(503).json({
      code: 'AI_UNAVAILABLE',
      error: 'Invoice extraction is unavailable. No invoice data was generated; enter the voucher manually.',
    });
  } catch (error: any) {
    console.error('Invoice extraction error:', error);
    res.status(500).json({ error: error.message || 'Invoice extraction failed' });
  }
});

// ============================================================================
// AI Receipt Extraction Endpoint (Protected)
// ============================================================================
app.post('/api/ai/extract-receipt', requireAuth, async (req, res) => {
  try {
    const validationError = validateAIRequest(req.body, 'extract');
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }
    const { content, mimeType } = req.body;
    const provider = getServerAIProvider(req.body.provider);

    const isImageOrPdf =
      content.startsWith('data:') ||
      mimeType?.startsWith('image/') ||
      mimeType === 'application/pdf';

    let base64Obj: { mimeType: string; data: string } | undefined;
    if (isImageOrPdf) {
      const data = content.includes(',') ? content.split(',')[1] : content;
      base64Obj = { mimeType: mimeType || 'image/jpeg', data };
    }

    const systemPrompt = `You are an expert AI Receipt & Expense Auditor.
Analyze the receipt image or text with accounting precision.
Auto-map the receipt to the most appropriate General Ledger Expense Account:
- "5250" (Vehicle Fuel & Fleet Logistics Expense) for gasoline, diesel, fuel stations (Shell, Chevron, BP, Exxon, Speedway, etc.)
- "5350" (Travel, Meals & Entertainment Expense) for restaurants, coffee shops (Starbucks, Costa), business lunches/dinners, rideshares (Uber, Lyft, Taxi), hotels, airfares (Delta, United)
- "5450" (Office Supplies & Consumables Expense) for stationery, paper, office hardware, retail supplies (Staples, Office Depot, Target, Amazon, Best Buy)
- "5200" (Cloud & Hosting Infrastructure Expense) for software subscriptions, server hosting (AWS, Google Cloud, DigitalOcean, GitHub)
- "5500" (Office Facilities & General Administrative) for utilities, rent, cleaning, general operations.

Evaluate the image clarity. If blurry, cut off, corrupted, or missing totalAmount / merchantName, set "isUnclear": true, add field names to "unclearFields", and write a helpful diagnostic in "unclearReason".

Always return strict JSON matching this schema:
{
  "merchantName": string,
  "transactionDate": string (YYYY-MM-DD),
  "currency": string (e.g. "USD"),
  "subtotal": string (decimal e.g. "45.00"),
  "taxAmount": string (decimal e.g. "3.60"),
  "totalAmount": string (decimal e.g. "48.60"),
  "category": string ("FUEL_LOGISTICS" | "TRAVEL_ENTERTAINMENT" | "OFFICE_SUPPLIES" | "MEALS_SUBSISTENCE" | "UTILITIES_OPERATIONS" | "SOFTWARE_SUBSCRIPTIONS" | "OTHER"),
  "suggestedAccountCode": string ("5250" | "5350" | "5450" | "5200" | "5500"),
  "suggestedAccountName": string,
  "confidenceScore": number (0.0 to 1.0),
  "notes": string,
  "isUnclear": boolean,
  "unclearReason": string,
  "unclearFields": string[]
}`;

    const userPrompt = isImageOrPdf
      ? 'Perform OCR extraction on this receipt slip, identify the merchant, total paid, tax, and evaluate readability.'
      : `Analyze this receipt transaction text:\n\n${content}`;

    try {
      const rawOutput = await callAIWithResilience(provider, systemPrompt, userPrompt, base64Obj);
      if (rawOutput) {
        const cleaned = rawOutput.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(cleaned);

        const missingMerchant =
          !parsed.merchantName ||
          parsed.merchantName.trim().length === 0 ||
          /unknown|unclear|unreadable/i.test(parsed.merchantName);
        const missingTotal =
          !parsed.totalAmount ||
          parsed.totalAmount === '0.00' ||
          parsed.totalAmount === '0' ||
          isNaN(parseFloat(parsed.totalAmount));

        if (missingMerchant || missingTotal) {
          parsed.isUnclear = true;
          parsed.unclearFields = parsed.unclearFields || [];
          if (missingMerchant && !parsed.unclearFields.includes('merchantName')) parsed.unclearFields.push('merchantName');
          if (missingTotal && !parsed.unclearFields.includes('totalAmount')) parsed.unclearFields.push('totalAmount');
          parsed.unclearReason =
            parsed.unclearReason ||
            "We couldn't clearly read the Total Amount or Merchant Name. Please ensure the paper is flat, well-lit, and capture a clearer snap.";
        }

        return res.json(parsed);
      }
    } catch (llmErr) {
      console.warn(`Receipt LLM extraction via ${provider} failed:`, llmErr);
    }

    return res.status(503).json({
      code: 'AI_UNAVAILABLE',
      error: 'Receipt extraction is unavailable. No receipt data was generated; enter the claim manually.',
    });
  } catch (error: any) {
    console.error('Receipt extraction error:', error);
    res.status(500).json({ error: error.message || 'Receipt extraction failed' });
  }
});

// ============================================================================
// AI Prompt-Driven Invoice Generator Endpoint (Protected)
// ============================================================================
app.post('/api/ai/generate-invoice', requireAuth, async (req, res) => {
  try {
    const validationError = validateAIRequest(req.body, 'generate');
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }
    const { prompt, content, mimeType } = req.body;
    const provider = getServerAIProvider(req.body.provider);

    const isImageOrPdf =
      content && (content.startsWith('data:') || mimeType?.startsWith('image/') || mimeType === 'application/pdf');

    let base64Obj: { mimeType: string; data: string } | undefined;
    if (isImageOrPdf) {
      const data = content.includes(',') ? content.split(',')[1] : content;
      base64Obj = { mimeType: mimeType || 'image/jpeg', data };
    }

    const systemPrompt = `You are an expert sales billing and accounts receivable AI engine.
Generate a complete, professional outbound sales invoice based on the user's natural language instructions or photographed work order / estimate sheet.
Calculate exact line items, unit prices, tax amounts, and totals with standard accounting precision.

Always return strict valid JSON matching this schema:
{
  "clientName": string,
  "clientEmail": string,
  "clientAddress": string,
  "clientTaxId": string,
  "invoiceNumber": string (e.g. "INV-2026-3001"),
  "invoiceDate": string (YYYY-MM-DD),
  "dueDate": string (YYYY-MM-DD),
  "currency": string (e.g. "USD"),
  "paymentTerms": string (e.g. "Net 30 Days"),
  "poNumber": string,
  "lineItems": [
    {
      "description": string,
      "quantity": number,
      "unitPrice": string (decimal),
      "total": string (decimal),
      "revenueAccountCode": string (e.g. "4010" for SaaS Subscription, "4020" for Implementation & Services)
    }
  ],
  "subtotal": string (decimal),
  "taxRatePercent": string (e.g. "7.5"),
  "taxAmount": string (decimal),
  "totalAmount": string (decimal),
  "notes": string,
  "bankWireDetails": string
}`;

    const userPrompt = prompt
      ? `Generate a formal sales invoice matching this prompt: "${prompt}"`
      : 'Convert this photographed job order / delivery note into a structured outbound billing invoice.';

    try {
      const rawOutput = await callAIWithResilience(provider, systemPrompt, userPrompt, base64Obj);
      if (rawOutput) {
        const cleaned = rawOutput.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(cleaned);
        return res.json(parsed);
      }
    } catch (err) {
      console.warn('AI invoice generation failed:', err);
    }

    return res.status(503).json({
      code: 'AI_UNAVAILABLE',
      error: 'AI invoice generation is unavailable. No invoice was generated; continue with manual review.',
    });
  } catch (error: any) {
    console.error('Invoice generation error:', error);
    res.status(500).json({ error: error.message || 'Invoice generation failed' });
  }
});

// ============================================================================
// Helper: ensure DB pool available
// ============================================================================
function requireDbPool(_req: any, res: any, next: any): void {
  if (!getDbPool()) {
    res.status(503).json({
      code: 'DATABASE_UNAVAILABLE',
      error: 'PostgreSQL database is not configured.',
    });
    return;
  }
  next();
}

// ============================================================================
// Accounting API Routes
// ============================================================================

// Chart of Accounts
app.get('/api/accounting/accounts', requireAuth, requireDbPool, async (req, res) => {
  try {
    const repo = new AccountingRepository();
    const orgId = 'default-org'; // TODO: derive from user session/org membership
    const accounts = await repo.listAccounts(orgId);
    res.json({ code: 'OK', data: accounts });
  } catch (err: any) {
    res.status(500).json({ code: 'ERROR', error: err.message });
  }
});

app.post('/api/accounting/accounts', requireAuth, requirePermissions('accounting:post_journal'), requireDbPool, validateBody(CreateAccountSchema), async (req, res) => {
  try {
    const repo = new AccountingRepository();
    const account = await repo.createAccount('default-org', req.body);
    res.status(201).json({ code: 'OK', data: account });
  } catch (err: any) {
    res.status(500).json({ code: 'ERROR', error: err.message });
  }
});

// Journal Entries
app.get('/api/accounting/journals', requireAuth, requirePermissions('accounting:view'), requireDbPool, async (req, res) => {
  try {
    const repo = new AccountingRepository();
    const entries = await repo.listJournalEntries('default-org');
    res.json({ code: 'OK', data: entries });
  } catch (err: any) {
    res.status(500).json({ code: 'ERROR', error: err.message });
  }
});

app.post('/api/accounting/journals', requireAuth, requirePermissions('accounting:post_journal'), requireDbPool, validateBody(CreateJournalEntrySchema), async (req: AuthenticatedRequest, res) => {
  try {
    const repo = new AccountingRepository();
    const entry = await repo.createJournalEntry('default-org', req.validatedBody);
    res.status(201).json({ code: 'OK', data: entry });
  } catch (err: any) {
    res.status(400).json({ code: 'ERROR', error: err.message });
  }
});

app.get('/api/accounting/journals/:id', requireAuth, requirePermissions('accounting:view'), requireDbPool, async (req, res) => {
  try {
    const repo = new AccountingRepository();
    const entry = await repo.getJournalEntryWithLines(req.params.id, 'default-org');
    if (!entry) return res.status(404).json({ code: 'NOT_FOUND', error: 'Journal entry not found.' });
    res.json({ code: 'OK', data: entry });
  } catch (err: any) {
    res.status(500).json({ code: 'ERROR', error: err.message });
  }
});

// Vendors
app.get('/api/accounting/vendors', requireAuth, requirePermissions('accounting:view'), requireDbPool, async (req, res) => {
  try {
    const repo = new AccountingRepository();
    const vendors = await repo.listVendors('default-org');
    res.json({ code: 'OK', data: vendors });
  } catch (err: any) {
    res.status(500).json({ code: 'ERROR', error: err.message });
  }
});

app.post('/api/accounting/vendors', requireAuth, requirePermissions('accounting:post_journal'), requireDbPool, validateBody(CreateVendorSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const repo = new AccountingRepository();
    const vendor = await repo.createVendor('default-org', req.validatedBody);
    res.status(201).json({ code: 'OK', data: vendor });
  } catch (err: any) {
    res.status(500).json({ code: 'ERROR', error: err.message });
  }
});

// Invoices
app.get('/api/accounting/invoices', requireAuth, requirePermissions('accounting:view'), requireDbPool, async (req, res) => {
  try {
    const repo = new AccountingRepository();
    const status = (req.query.status as string) || undefined;
    const invoices = await repo.listInvoices('default-org', status);
    res.json({ code: 'OK', data: invoices });
  } catch (err: any) {
    res.status(500).json({ code: 'ERROR', error: err.message });
  }
});

app.post('/api/accounting/invoices', requireAuth, requirePermissions('accounting:approve_invoice'), requireDbPool, validateBody(CreateInvoiceSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const repo = new AccountingRepository();
    const invoice = await repo.createInvoice('default-org', req.validatedBody);
    res.status(201).json({ code: 'OK', data: invoice });
  } catch (err: any) {
    res.status(500).json({ code: 'ERROR', error: err.message });
  }
});

app.patch('/api/accounting/invoices/:id/status', requireAuth, requirePermissions('accounting:approve_invoice'), requireDbPool, validateBody(UpdateInvoiceStatusSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const repo = new AccountingRepository();
    const { status, journal_entry_id } = req.validatedBody as { status: string; journal_entry_id?: string };
    const invoice = await repo.updateInvoiceStatus(req.params.id, status, journal_entry_id);
    res.json({ code: 'OK', data: invoice });
  } catch (err: any) {
    res.status(500).json({ code: 'ERROR', error: err.message });
  }
});

// Reports
app.get('/api/accounting/reports/trial-balance', requireAuth, requirePermissions('accounting:view_reports'), requireDbPool, async (req, res) => {
  try {
    const repo = new AccountingRepository();
    const rows = await repo.generateTrialBalance('default-org');
    res.json({ code: 'OK', data: rows });
  } catch (err: any) {
    res.status(500).json({ code: 'ERROR', error: err.message });
  }
});

app.get('/api/accounting/reports/ap-aging', requireAuth, requirePermissions('accounting:view_reports'), requireDbPool, async (req, res) => {
  try {
    const repo = new AccountingRepository();
    const asOf = (req.query.asOf as string) || new Date().toISOString().split('T')[0];
    const rows = await repo.generateAPAging('default-org', asOf);
    res.json({ code: 'OK', data: rows });
  } catch (err: any) {
    res.status(500).json({ code: 'ERROR', error: err.message });
  }
});

// ============================================================================
// HRM API Routes
// ============================================================================

// Departments
app.get('/api/hrm/departments', requireAuth, requirePermissions('hrm:view'), requireDbPool, async (req, res) => {
  try {
    const repo = new HRMRepository();
    const depts = await repo.listDepartments('default-org');
    res.json({ code: 'OK', data: depts });
  } catch (err: any) {
    res.status(500).json({ code: 'ERROR', error: err.message });
  }
});

app.post('/api/hrm/departments', requireAuth, requirePermissions('hrm:manage_employees'), requireDbPool, validateBody(CreateDepartmentSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const repo = new HRMRepository();
    const dept = await repo.createDepartment('default-org', req.validatedBody);
    res.status(201).json({ code: 'OK', data: dept });
  } catch (err: any) {
    res.status(500).json({ code: 'ERROR', error: err.message });
  }
});

// Employees
app.get('/api/hrm/employees', requireAuth, requirePermissions('hrm:view'), requireDbPool, async (req, res) => {
  try {
    const repo = new HRMRepository();
    const employees = await repo.listEmployees('default-org');
    res.json({ code: 'OK', data: employees });
  } catch (err: any) {
    res.status(500).json({ code: 'ERROR', error: err.message });
  }
});

app.post('/api/hrm/employees', requireAuth, requirePermissions('hrm:manage_employees'), requireDbPool, validateBody(CreateEmployeeSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const repo = new HRMRepository();
    const employee = await repo.createEmployee('default-org', req.validatedBody);
    res.status(201).json({ code: 'OK', data: employee });
  } catch (err: any) {
    res.status(500).json({ code: 'ERROR', error: err.message });
  }
});

app.patch('/api/hrm/employees/:id', requireAuth, requirePermissions('hrm:manage_employees'), requireDbPool, validateBody(UpdateEmployeeSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const repo = new HRMRepository();
    const employee = await repo.updateEmployee(req.params.id, 'default-org', req.validatedBody);
    res.json({ code: 'OK', data: employee });
  } catch (err: any) {
    res.status(500).json({ code: 'ERROR', error: err.message });
  }
});

app.delete('/api/hrm/employees/:id', requireAuth, requirePermissions('hrm:manage_employees'), requireDbPool, async (req, res) => {
  try {
    const repo = new HRMRepository();
    const deleted = await repo.deleteEmployee(req.params.id, 'default-org');
    if (!deleted) return res.status(404).json({ code: 'NOT_FOUND', error: 'Employee not found.' });
    res.json({ code: 'OK', message: 'Employee deleted.' });
  } catch (err: any) {
    res.status(500).json({ code: 'ERROR', error: err.message });
  }
});

// Attendance
app.get('/api/hrm/attendance', requireAuth, requirePermissions('hrm:view'), requireDbPool, async (req, res) => {
  try {
    const repo = new HRMRepository();
    const attendance = await repo.listAttendance('default-org');
    res.json({ code: 'OK', data: attendance });
  } catch (err: any) {
    res.status(500).json({ code: 'ERROR', error: err.message });
  }
});

app.post('/api/hrm/attendance', requireAuth, requirePermissions('hrm:view'), requireDbPool, validateBody(RecordAttendanceSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const repo = new HRMRepository();
    const record = await repo.recordAttendance('default-org', req.validatedBody);
    res.status(201).json({ code: 'OK', data: record });
  } catch (err: any) {
    res.status(400).json({ code: 'ERROR', error: err.message });
  }
});

// Leave Requests
app.get('/api/hrm/leave', requireAuth, requirePermissions('hrm:view'), requireDbPool, async (req, res) => {
  try {
    const repo = new HRMRepository();
    const requests = await repo.listLeaveRequests('default-org');
    res.json({ code: 'OK', data: requests });
  } catch (err: any) {
    res.status(500).json({ code: 'ERROR', error: err.message });
  }
});

app.post('/api/hrm/leave', requireAuth, requirePermissions('hrm:view'), requireDbPool, validateBody(CreateLeaveRequestSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const repo = new HRMRepository();
    const request = await repo.createLeaveRequest('default-org', req.validatedBody);
    res.status(201).json({ code: 'OK', data: request });
  } catch (err: any) {
    res.status(500).json({ code: 'ERROR', error: err.message });
  }
});

app.patch('/api/hrm/leave/:id/status', requireAuth, requirePermissions('hrm:approve_leave'), requireDbPool, validateBody(UpdateLeaveStatusSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const repo = new HRMRepository();
    const { status, reviewed_by } = req.validatedBody as { status: 'APPROVED' | 'REJECTED'; reviewed_by: string };
    const request = await repo.updateLeaveStatus(req.params.id, 'default-org', status, reviewed_by);
    res.json({ code: 'OK', data: request });
  } catch (err: any) {
    res.status(500).json({ code: 'ERROR', error: err.message });
  }
});

// Payroll
app.post('/api/hrm/payroll/runs', requireAuth, requirePermissions('hrm:run_payroll'), requireDbPool, validateBody(CreatePayrollRunSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const repo = new HRMRepository();
    const run = await repo.createPayrollRun('default-org', req.validatedBody);
    res.status(201).json({ code: 'OK', data: run });
  } catch (err: any) {
    res.status(500).json({ code: 'ERROR', error: err.message });
  }
});

app.post('/api/hrm/payroll/records', requireAuth, requirePermissions('hrm:run_payroll'), requireDbPool, validateBody(CreatePayrollRecordSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const repo = new HRMRepository();
    const record = await repo.createPayrollRecord('default-org', req.validatedBody);
    res.status(201).json({ code: 'OK', data: record });
  } catch (err: any) {
    res.status(500).json({ code: 'ERROR', error: err.message });
  }
});

app.get('/api/hrm/payroll/runs/:runId/records', requireAuth, requirePermissions('hrm:view'), requireDbPool, async (req, res) => {
  try {
    const repo = new HRMRepository();
    const records = await repo.listPayrollRecords(req.params.runId, 'default-org');
    res.json({ code: 'OK', data: records });
  } catch (err: any) {
    res.status(500).json({ code: 'ERROR', error: err.message });
  }
});

// ============================================================================
// Receipts API Routes
// ============================================================================

app.get('/api/receipts', requireAuth, requirePermissions('receipts:view'), requireDbPool, async (req, res) => {
  try {
    const repo = new ReceiptRepository();
    const receipts = await repo.listReceipts('default-org');
    res.json({ code: 'OK', data: receipts });
  } catch (err: any) {
    res.status(500).json({ code: 'ERROR', error: err.message });
  }
});

app.post('/api/receipts', requireAuth, requirePermissions('receipts:submit'), requireDbPool, validateBody(CreateReceiptSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const repo = new ReceiptRepository();
    const receipt = await repo.createReceipt('default-org', {
      ...(req.validatedBody as any),
      claimant_user_id: req.user?.id || 'system',
    } as any);
    res.status(201).json({ code: 'OK', data: receipt });
  } catch (err: any) {
    res.status(500).json({ code: 'ERROR', error: err.message });
  }
});

app.patch('/api/receipts/:id/status', requireAuth, requirePermissions('receipts:approve'), requireDbPool, validateBody(UpdateReceiptStatusSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const repo = new ReceiptRepository();
    const { status, reviewer_user_id, journal_entry_id, rejection_reason } = req.validatedBody as {
      status: string;
      reviewer_user_id?: string;
      journal_entry_id?: string;
      rejection_reason?: string;
    };
    const receipt = await repo.updateReceiptStatus(
      req.params.id,
      'default-org',
      status,
      reviewer_user_id,
      journal_entry_id,
      rejection_reason
    );
    res.json({ code: 'OK', data: receipt });
  } catch (err: any) {
    res.status(500).json({ code: 'ERROR', error: err.message });
  }
});

app.get('/api/receipts/summary', requireAuth, requirePermissions('receipts:view'), requireDbPool, async (req, res) => {
  try {
    const repo = new ReceiptRepository();
    const summary = await repo.getReceiptSummary('default-org');
    res.json({ code: 'OK', data: summary });
  } catch (err: any) {
    res.status(500).json({ code: 'ERROR', error: err.message });
  }
});

// ============================================================================
// User Management API Routes
// ============================================================================

app.get('/api/auth/users', requireAuth, requirePermissions('admin:audit_logs'), requireDbPool, async (req, res) => {
  try {
    const repo = new AuthRepository();
    const users = await repo.listUsers('default-org');
    res.json({ code: 'OK', data: users });
  } catch (err: any) {
    res.status(500).json({ code: 'ERROR', error: err.message });
  }
});

// ============================================================================
// Audit Logs API Routes
// ============================================================================

app.get('/api/audit/logs', requireAuth, requirePermissions('admin:audit_logs'), requireDbPool, async (req, res) => {
  try {
    const repo = new AuthRepository();
    const logs = await repo.listAuditLogs('default-org');
    res.json({ code: 'OK', data: logs });
  } catch (err: any) {
    res.status(500).json({ code: 'ERROR', error: err.message });
  }
});

// ============================================================================
// Server Startup
// ============================================================================
async function startServer() {
  const pool = getDbPool();
  if (pool) {
    const healthy = await dbIsHealthy();
    if (healthy) {
      console.log('Database connected. Run "bun run db:migrate" to apply pending migrations.');
    } else {
      console.warn('Database configured but not reachable. Migrations must be run manually.');
    }
  } else {
    console.log('No DATABASE_URL configured. Running in in-memory mode.');
  }
  // Use Vite dev middleware with HMR by default (development mode).
  // Only serve static dist files when explicitly NODE_ENV=production.
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`AUDMA OS server running on http://0.0.0.0:${PORT}`);
    console.log(`Environment: ${NODE_ENV}`);
    console.log(`Database: ${pgPool ? 'PostgreSQL connected' : 'Not configured (in-memory)'}`);
    console.log(`Authentication: ${pgPool ? 'Enabled (PostgreSQL sessions)' : 'Disabled (no DATABASE_URL)'}`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received, shutting down gracefully...`);
    server.close(() => {
      console.log('HTTP server closed.');
    });
    try {
      await closeDatabasePool();
      await closeDbPool();
      console.log('Database pools closed.');
    } catch (err) {
      console.error('Error closing database pools:', err);
    }
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer();
