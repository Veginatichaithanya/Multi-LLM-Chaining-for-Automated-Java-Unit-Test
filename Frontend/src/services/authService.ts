/**
 * authService.ts — Authentication API calls.
 *
 * This module is the ONLY place in the frontend that calls auth endpoints.
 * AuthContext consumes it directly.
 *
 * Mock fallback:
 *   If the backend is unreachable (ApiError status === 0), the service
 *   automatically falls back to the development mock so the frontend
 *   remains usable without a running server.
 */

import type { User } from '../types/user';
import { api, ApiError, storeToken, clearToken, getBaseUrl, getStoredToken } from './api';
import { mockLogin as devMockLogin, mockRegister as devMockRegister, storeUser, clearStoredUser } from '../mock/auth';

// ── Types mirroring backend schemas ───────────────────────────────────────────

interface UserOut {
  id: string;
  email: string;
  name: string;
  role: string | null;
  avatar_url: string | null;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  user: UserOut;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/** Map the backend UserOut shape to the frontend User type. */
function toUser(out: UserOut): User {
  return {
    id: out.id,
    email: out.email,
    name: out.name,
    role: out.role ?? undefined,
    avatar: out.avatar_url ?? undefined,
  };
}

// ── Auth service ──────────────────────────────────────────────────────────────

export const authService = {
  /**
   * Authenticate with email + password.
   *
   * Strategy:
   * 1. Try the real FastAPI backend first.
   * 2. If the backend is unreachable (status 0): fall back to the local
   *    dev-mock store (covers Render cold-starts and offline dev).
   * 3. If the backend returns a 401/422 (bad credentials) BUT the email
   *    exists in the local mock store (i.e. the user registered while the
   *    backend was offline): also try mock login.
   *    This prevents the "registered offline, backend woke up" lock-out bug.
   * 4. Otherwise re-throw the original error.
   */
  async login(email: string, password: string): Promise<User> {
    const cleanEmail = email.trim().toLowerCase();

    // ── Attempt 1: Real backend ────────────────────────────────────────────
    try {
      const { access_token, user: userOut } = await api.post<TokenResponse>(
        '/auth/login',
        { email: cleanEmail, password },
        false, // public endpoint — no Bearer token needed
      );

      storeToken(access_token);
      const user = toUser(userOut);
      storeUser(user);
      return user;
    } catch (err) {
      // ── Attempt 2: Mock fallback (backend offline OR bad credentials) ─────
      // We try mock for:
      //   status 0   → backend completely unreachable (offline / cold-start)
      //   status 401 → backend online but user only exists in mock store
      //   status 422 → validation error from backend for a mock-only account
      const shouldTryMock =
        err instanceof ApiError &&
        (err.status === 0 || err.status === 401 || err.status === 422);

      if (shouldTryMock) {
        try {
          const devUser = await devMockLogin(cleanEmail, password);
          if (err instanceof ApiError && err.status === 0) {
            console.warn(
              '[authService] Backend offline — logged in using local dev/mock account.',
            );
          } else {
            console.warn(
              '[authService] Backend returned auth error; user found in local mock store. ' +
              'This account was likely registered while the backend was offline.',
            );
          }
          return devUser;
        } catch {
          // Mock also failed — decide on the best error message
          if (err instanceof ApiError && err.status === 0) {
            // Backend completely unreachable AND no local account
            const activeUrl = getBaseUrl();
            throw new Error(
              `Unable to connect to TestForge backend (${activeUrl}). ` +
              `If hosted on Render free tier, the service may be spinning up from sleep (takes ~30s). ` +
              `Please wait a moment and try again.`,
            );
          }
          // Backend is online and rejected credentials — surface the real error
          throw err;
        }
      }

      // Re-throw any other real API errors (403, 409, 500, etc.)
      throw err;
    }
  },

  /**
   * Register a new account.
   */
  async register(email: string, password: string, name: string, role?: string): Promise<User> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    try {
      const { user: userOut } = await api.post<TokenResponse>(
        '/auth/register',
        { email: cleanEmail, password, name: cleanName, role },
        false,
      );

      // Do NOT auto-login; user will manually enter their credentials on the login page
      return toUser(userOut);
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) {
        console.warn('[authService] Backend unreachable — using dev mock registration');
        return devMockRegister(cleanEmail, password, cleanName, role);
      }
      throw err;
    }
  },

  /**
   * Fetch the current user profile using the stored token.
   * Used to restore session on page refresh.
   *
   * Uses a short 5s timeout so a sleeping/offline backend never causes a
   * 30-second black screen on initial load. The caller (AuthContext) will
   * fall back to the localStorage cached user if this returns null.
   */
  async getMe(): Promise<User | null> {
    // No stored token → skip the network call entirely
    if (!getStoredToken()) return null;

    try {
      // 5 s is enough to verify a live backend; avoids a 30 s black screen
      // when the Render free-tier instance is sleeping.
      const userOut = await api.get<UserOut>('/users/me', true, 5000);
      return toUser(userOut);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401 || err.status === 403) {
          // Token expired or invalid — clear it so the user is prompted to log in
          authService.logout();
        }
        // status 0 = backend offline/timeout — fall through and return null;
        // AuthContext will restore from the localStorage snapshot instead.
      }
      return null;
    }
  },

  /**
   * Request a password reset link for the given email.
   * The backend never reveals whether the email exists.
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    return api.post<{ message: string }>(
      '/api/auth/forgot-password',
      { email },
      false,
    );
  },

  /**
   * Reset password using a one-time reset token.
   */
  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    return api.post<{ message: string }>(
      '/api/auth/reset-password',
      { token, new_password: newPassword },
      false,
    );
  },

  /**
   * Clear all auth state from localStorage.
   */
  logout(): void {
    clearToken();
    clearStoredUser();
  },
};
