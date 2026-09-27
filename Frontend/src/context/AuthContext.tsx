import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../types/user';
import { authService } from '../services/authService';
import { getStoredUser } from '../mock/auth'; // localStorage fallback for session restore

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string, name: string, role?: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Restore session on mount:
  // 1. Try to validate the stored JWT with the real backend (GET /users/me)
  // 2. Fall back to localStorage snapshot when backend is offline
  useEffect(() => {
    const restoreSession = async () => {
      try {
        // Attempt real session validation
        const liveUser = await authService.getMe();
        if (liveUser) {
          setUser(liveUser);
          return;
        }
      } catch {
        // getMe() already handles token cleanup on 401/403
      }
      // Backend offline — use cached user from localStorage
      try {
        const cached = getStoredUser();
        if (cached) setUser(cached);
      } catch {
        // Ignore storage errors
      }
    };

    restoreSession().finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    setIsLoading(true);
    try {
      const authenticatedUser = await authService.login(email, password);
      setUser(authenticatedUser);
      return authenticatedUser;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    email: string,
    password: string,
    name: string,
    role?: string,
  ): Promise<User> => {
    setIsLoading(true);
    try {
      const newUser = await authService.register(email, password, name, role);
      // Do not setUser here: user will enter credentials on the login page
      return newUser;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
