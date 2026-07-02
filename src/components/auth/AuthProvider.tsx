"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { normalizeRole, type Role } from "@/lib/roles";
import {
  getSession,
  setSession as persistSession,
  clearSession,
  type Session,
  type SessionUser,
} from "@/lib/auth-session";
import { setTokens, clearTokens, getAccessToken } from "@/lib/auth-tokens"; // added getAccessToken
import { switchRole as switchRoleRequest } from "@/services/auth.service";

// ---------------------------------------------------------------------------
// The backend base URL. Reads NEXT_PUBLIC_API_URL from .env.local if set,
// otherwise falls back to localhost for local development. Matches the same
// pattern auth-tokens.ts uses for its NEXT_PUBLIC_* env vars.
// ---------------------------------------------------------------------------
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

interface AuthContextValue {
  role: Role | null;
  user: SessionUser | undefined;
  /** True once the persisted session has been read from localStorage. */
  isLoaded: boolean;
  /** Persist a session (e.g. right after login). */
  setSession: (session: Session) => void;
  /** Switch the active role: backend re-issues a token, then we re-render. */
  switchRole: (target: Role) => Promise<void>;
  /** Revoke the current session on the backend, then clear local state and return to login. */
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [session, setSessionState] = useState<Session | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSessionState(getSession());
    setIsLoaded(true);
  }, []);

  const setSession = useCallback((next: Session) => {
    persistSession(next);
    setSessionState(next);
  }, []);

  const switchRole = useCallback(
    async (target: Role) => {
      const res = await switchRoleRequest({ role: target });
      const data = res.data;
      if (!data?.accessToken || !data?.refreshToken) {
        throw { message: res.message ?? "Couldn't switch account type." };
      }
      setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      const next: Session = { role: normalizeRole(data.role) ?? target, user: session?.user };
      persistSession(next);
      setSessionState(next);
    },
    [session?.user]
  );

  const logout = useCallback(async () => {
    /*
     * Step 1 — best-effort backend revocation.
     *
     * Call POST /api/v1/sessions/logout with the current access token so
     * the backend flips is_revoked = true on this session row immediately.
     * This means any subsequent request using this token is rejected with
     * 401 right away, instead of remaining valid for up to 15 more minutes
     * until the JWT naturally expires.
     *
     * The token must be read BEFORE clearTokens() removes it from
     * localStorage — that's why this block comes first.
     *
     * The whole block is wrapped in try/catch so a network failure, server
     * error, or already-expired token never blocks the user from logging
     * out locally. The finally block always runs.
     */
    try {
      const token = getAccessToken();
      if (token) {
        await fetch(`${API_BASE_URL}/api/v1/sessions/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
      // Ignore — local logout always completes in the finally block below.
    } finally {
      /*
       * Step 2 — local cleanup.
       *
       * Always runs, even if the backend call threw or returned an error.
       * Order: clear storage first, then update React state, then navigate
       * (so there's no brief window where the UI still shows authenticated
       * content while the token is already gone from storage).
       */
      clearTokens();
      clearSession();
      setSessionState(null);
      router.push("/login");
    }
  }, [router]);

  const value = useMemo(
    () => ({
      role: session?.role ?? null,
      user: session?.user,
      isLoaded,
      setSession,
      switchRole,
      logout,
    }),
    [session, isLoaded, setSession, switchRole, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
