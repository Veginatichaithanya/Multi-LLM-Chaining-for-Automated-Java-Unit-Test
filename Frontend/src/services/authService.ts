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
import { api, ApiError, storeToken, clearToken } from './api';
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
   * 1. Tries the real FastAPI backend first.
   * 2. Falls back to the dev mock if the backend is unreachable (status 0).
   *
   * On success: stores the JWT + user in localStorage and returns User.
   * On failure: throws an Error with a user-readable message.
   */
  async login(email: string, password: string): Promise<User> {
    try {
      const { access_token, user: userOut } = await api.post<TokenResponse>(
        '/auth/login',
        { email, password },
        false, // public endpoint — no Bearer token needed
      );

      storeToken(access_token);
      const user = toUser(userOut);
      storeUser(user); // keep the existing session key for ProtectedRoute
      return user;
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) {
        // Backend is offline — use dev mock silently
        console.warn('[authService] Backend unreachable — using dev mock login');
        return devMockLogin(email, password);
      }
      // Re-throw real API errors (401, 409, 422, etc.)
      throw err;
    }
  },

  /**
   * Register a new account.
   *
   * On success: stores the JWT + user and returns User.
   * Falls back to a mock register if backend is unreachable.
   */
  async register(email: string, password: string, name: string, role?: string): Promise<User> {
    try {
      const { access_token, user: userOut } = await api.post<TokenResponse>(
        '/auth/register',
        { email, password, name, role },
        false,
      );

      storeToken(access_token);
      const user = toUser(userOut);
      storeUser(user);
      return user;
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) {
        console.warn('[authService] Backend unreachable — using dev mock registration');
        return devMockRegister(email, password, name, role);
      }
      throw err;
    }
  },

  /**
   * Fetch the current user profile using the stored token.
   * Used to restore session on page refresh.
   */
  async getMe(): Promise<User | null> {
    try {
      const userOut = await api.get<UserOut>('/users/me', true);
      return toUser(userOut);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401 || err.status === 403) {
          // Token expired or invalid
          authService.logout();
        }
        // status 0 = backend offline — caller handles it
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
