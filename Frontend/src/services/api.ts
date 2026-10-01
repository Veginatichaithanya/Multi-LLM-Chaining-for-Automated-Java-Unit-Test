/**
 * api.ts — Core HTTP client for the TestForge AI backend.
 *
 * Responsibilities:
 *  - Reads VITE_API_BASE_URL from import.meta.env with fallback to localStorage
 *  - Strips trailing slashes to prevent 307 / double-slash URL routing errors
 *  - Supports configurable timeouts with Render-friendly 30s default (120s for AI/experiments)
 *  - Attaches Bearer token from localStorage automatically
 *  - Provides typed get / post / put / patch / del helpers
 *  - Provides health ping and runtime API base URL reconfiguration
 */

const TOKEN_KEY = 'testforge_access_token';
const API_URL_KEY = 'testforge_api_base_url';

// ── Base URL helpers ─────────────────────────────────────────────────────────

export function getStoredApiUrl(): string | null {
  try {
    return localStorage.getItem(API_URL_KEY);
  } catch {
    return null;
  }
}

export function setApiBaseUrl(url: string | null): void {
  try {
    if (!url || !url.trim()) {
      localStorage.removeItem(API_URL_KEY);
    } else {
      localStorage.setItem(API_URL_KEY, url.trim().replace(/\/+$/, ''));
    }
  } catch {
    // Ignore storage errors in private browsing
  }
}

export function getBaseUrl(): string {
  // 1. User manual override stored in browser
  const customUrl = getStoredApiUrl();
  if (customUrl && customUrl.trim()) {
    return customUrl.trim().replace(/\/+$/, '');
  }

  // 2. Vite environment variable from build/dev
  const envUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }

  // 3. Browser environment heuristics
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // Localhost development
    if (hostname === '127.0.0.1') {
      return 'http://127.0.0.1:8000';
    }
    if (hostname === 'localhost') {
      return 'http://localhost:8000';
    }
    // Cloud / Render deployment: if no env URL set, relative / or warn
    if (window.location.protocol === 'https:' && hostname.includes('onrender.com')) {
      console.warn(
        '[TestForge API] Running on Render without VITE_API_BASE_URL configured. ' +
        'Defaulting to backend URL or same-origin proxy. ' +
        'You can configure the backend URL via setApiBaseUrl().'
      );
    }
  }

  return 'http://localhost:8000';
}

// ── Token helpers ─────────────────────────────────────────────────────────────

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function storeToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Gracefully handle storage errors (private windows, quota exceeded)
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Ignore
  }
}

// ── Error type ────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  readonly status: number;
  readonly detail?: unknown;

  constructor(status: number, message: string, detail?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

// ── Core fetch wrapper ────────────────────────────────────────────────────────

export interface RequestOptions {
  authenticated?: boolean;
  timeoutMs?: number;
}

export const DEFAULT_TIMEOUT_MS = 30000; // 30 seconds for Render cold-starts
export const AI_TIMEOUT_MS = 120000;     // 2 minutes for LLM generation & execution

async function request<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
  authenticated = true,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  if (authenticated) {
    const token = getStoredToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const baseUrl = getBaseUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const fullUrl = `${baseUrl}${normalizedPath}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(fullUrl, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (networkError) {
    const isTimeout = networkError instanceof Error && networkError.name === 'AbortError';
    const errorMsg = isTimeout
      ? `Request timed out after ${Math.round(timeoutMs / 1000)}s. If your backend is hosted on Render free tier, it may be waking up from sleep. Please try again.`
      : `Cannot reach API server at ${baseUrl}. Please verify the backend is online and CORS is configured.`;
    throw new ApiError(0, errorMsg, networkError);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    let detail: unknown;
    try {
      detail = await response.json();
    } catch {
      detail = await response.text();
    }

    const message =
      typeof detail === 'object' && detail !== null && 'detail' in detail
        ? String((detail as { detail: unknown }).detail)
        : `HTTP ${response.status} ${response.statusText}`;

    throw new ApiError(response.status, message, detail);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as unknown as T;
  }

  return response.json() as Promise<T>;
}

// ── Typed convenience methods ─────────────────────────────────────────────────

export const api = {
  get<T>(path: string, authenticated = true, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
    return request<T>('GET', path, undefined, authenticated, timeoutMs);
  },

  post<T>(path: string, body: unknown, authenticated = false, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
    return request<T>('POST', path, body, authenticated, timeoutMs);
  },

  put<T>(path: string, body: unknown, authenticated = true, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
    return request<T>('PUT', path, body, authenticated, timeoutMs);
  },

  patch<T>(path: string, body: unknown, authenticated = true, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
    return request<T>('PATCH', path, body, authenticated, timeoutMs);
  },

  del<T>(path: string, authenticated = true, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
    return request<T>('DELETE', path, undefined, authenticated, timeoutMs);
  },
};

// ── Health & Warmup Diagnostics ──────────────────────────────────────────────

export interface HealthCheckResult {
  ok: boolean;
  status: string;
  url: string;
  latencyMs: number;
  environment?: string;
  database?: string;
}

/**
 * Lightweight probe to wake up Render instances and verify connectivity.
 */
export async function pingApiHealth(timeoutMs = 15000): Promise<HealthCheckResult> {
  const start = performance.now();
  const baseUrl = getBaseUrl();
  try {
    const res = await request<{ status: string; env?: string; database?: string }>(
      'GET',
      '/health',
      undefined,
      false,
      timeoutMs,
    );
    const latencyMs = Math.round(performance.now() - start);
    return {
      ok: res?.status === 'ok',
      status: res?.status || 'ok',
      url: baseUrl,
      latencyMs,
      environment: res?.env,
      database: res?.database,
    };
  } catch (err) {
    const latencyMs = Math.round(performance.now() - start);
    return {
      ok: false,
      status: err instanceof Error ? err.message : 'unreachable',
      url: baseUrl,
      latencyMs,
    };
  }
}
