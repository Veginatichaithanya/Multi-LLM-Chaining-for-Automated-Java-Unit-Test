/**
 * api.ts — Core HTTP client for the TestForge AI backend.
 *
 * Responsibilities:
 *  - Reads VITE_API_BASE_URL from import.meta.env
 *  - Attaches Bearer token from localStorage automatically
 *  - Throws typed ApiError on non-2xx responses
 *  - Provides typed get / post / put / del helpers
 *
 * When the backend is unavailable (network error) this module
 * throws an ApiError with status 0 so callers can detect it and
 * fall back to mock data if needed.
 */

function getBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (typeof window !== 'undefined') {
    // Avoid Windows dual-stack IPv6 resolution delay on localhost vs 127.0.0.1
    if (window.location.hostname === '127.0.0.1') {
      if (!envUrl || envUrl.includes('localhost')) {
        return 'http://127.0.0.1:8000';
      }
    }
    if (window.location.hostname === 'localhost') {
      return envUrl ?? 'http://localhost:8000';
    }
  }
  return envUrl ?? 'http://localhost:8000';
}

const TOKEN_KEY = 'testforge_access_token';

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

async function request<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
  authenticated = true,
  timeoutMs = 5000,
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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${getBaseUrl()}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (networkError) {
    // Backend is unreachable or timed out
    const isTimeout = networkError instanceof Error && networkError.name === 'AbortError';
    const errorMsg = isTimeout
      ? 'Connection timed out while validating credentials. Switching to offline mode.'
      : 'Cannot reach the API server. Is the backend running?';
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
  get<T>(path: string, authenticated = true): Promise<T> {
    return request<T>('GET', path, undefined, authenticated);
  },

  post<T>(path: string, body: unknown, authenticated = false): Promise<T> {
    return request<T>('POST', path, body, authenticated);
  },

  put<T>(path: string, body: unknown, authenticated = true): Promise<T> {
    return request<T>('PUT', path, body, authenticated);
  },

  patch<T>(path: string, body: unknown, authenticated = true): Promise<T> {
    return request<T>('PATCH', path, body, authenticated);
  },

  del<T>(path: string, authenticated = true): Promise<T> {
    return request<T>('DELETE', path, undefined, authenticated);
  },
};
