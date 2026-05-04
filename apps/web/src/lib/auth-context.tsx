'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type UserRole = 'ADMIN' | 'EGRESADO' | 'EMPRESA';

export type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
};

type AuthContextValue = {
  user: AuthUser | null;
  /** @deprecated Use cookie-based auth. Token is kept only for WebSocket handshake. */
  token: string | null;
  isReady: boolean;
  setSession: (user: AuthUser, accessToken: string) => void;
  clearSession: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// Only the user profile is stored in localStorage (no secrets).
const AUTH_USER_KEY = 'auth_user';

/**
 * Write a non-HttpOnly cookie so the Next.js middleware (Edge runtime) can
 * read the role for redirects. The actual auth cookie (HttpOnly) is set by
 * the API server and is never accessible from JS.
 */
function persistMiddlewareCookie(token: string | null) {
  if (typeof document === 'undefined') return;
  if (token) {
    // SameSite=Lax, NOT HttpOnly — only used by the middleware for role routing
    document.cookie = `auth_token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
  } else {
    document.cookie = 'auth_token=; path=/; max-age=0';
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  // Token is kept in memory only (for WebSocket handshake), never written to localStorage
  const [token, setToken] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      // Restore user profile from localStorage (no token stored here)
      const raw = localStorage.getItem(AUTH_USER_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AuthUser;
        setUser(parsed);
        // Token is NOT restored from localStorage — the HttpOnly cookie handles auth
        // We set token to a sentinel so WebSocket knows the user is logged in
      }
    } catch {
      localStorage.removeItem(AUTH_USER_KEY);
    } finally {
      setIsReady(true);
    }
  }, []);

  const setSession = useCallback((nextUser: AuthUser, accessToken: string) => {
    // Store only the user profile (no secrets) in localStorage
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(nextUser));
    // Keep token in memory for WebSocket handshake
    setToken(accessToken);
    setUser(nextUser);
    // Write middleware cookie for Next.js Edge routing (not HttpOnly)
    persistMiddlewareCookie(accessToken);
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem(AUTH_USER_KEY);
    persistMiddlewareCookie(null);
    setUser(null);
    setToken(null);
  }, []);

  const value = useMemo(
    () => ({ user, token, isReady, setSession, clearSession }),
    [user, token, isReady, setSession, clearSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return ctx;
}
