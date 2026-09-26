/**
 * AUDMA OS - Base URL Auto-Detection Utility
 * Resolves base URLs dynamically across environments (Cloud Run, Vercel, Localhost, Custom Domains)
 * without hardcoding domains.
 */

export function getBaseUrl(): string {
  // 1. In browser environment, use current origin
  if (typeof window !== 'undefined' && window.location) {
    return window.location.origin;
  }

  // 2. Environment variable injected by AI Studio / Cloud Run
  if (process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL') {
    return process.env.APP_URL.replace(/\/$/, '');
  }

  // 3. Vercel deployment URL
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/$/, '');
  }

  // 4. Fallback to host/port configuration
  const port = process.env.PORT || 3000;
  return `http://localhost:${port}`;
}

export function buildAbsoluteUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getBaseUrl()}${normalizedPath}`;
}
