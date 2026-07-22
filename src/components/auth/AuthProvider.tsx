"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { normalizeRole, type Role } from "@/lib/roles";
import {
  getSession,
  setSession as persistSession,
  type Session,
  type SessionUser,
} from "@/lib/auth-session";
import { switchRole as switchRoleRequest } from "@/services/auth.service";

// ---------------------------------------------------------------------------
// The backend base URL. Reads NEXT_PUBLIC_API_URL from .env.local if set,
// otherwise falls back to localhost for local development.
// ---------------------------------------------------------------------------
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

interface AuthContextValue {
  role: Role | null;
  user: SessionUser | undefined;
  tokenType: string | undefined;
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
      // Tokens are httpOnly cookies now — the backend sets the re-issued cookie
      // directly on this response, so there's nothing for the client to store.
      const res = await switchRoleRequest({ role: target });
      const data = res.data;
      const next: Session = { role: normalizeRole(data?.role) ?? target, user: session?.user };
      persistSession(next);
      setSessionState(next);
    },
    [session?.user]
  );

  const logout = useCallback(async () => {
    /*
     * Step 1 — best-effort backend revocation.
     *
     * Call POST /api/v1/sessions/logout so the backend flips is_revoked = true
     * on this session row immediately (instead of waiting for natural token
     * expiry), AND clears the httpOnly auth cookies via Set-Cookie on this same
     * response. The access token is an httpOnly cookie now — the browser
     * attaches it automatically via credentials: "include"; there's nothing
     * for JS to read or put in a header.
     *
     * Wrapped in try/catch so a network failure or already-expired session
     * never blocks the user from logging out locally. The finally block
     * always runs.
     */
    try {
      await fetch(`${API_BASE_URL}/api/v1/sessions/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Ignore — local logout always completes in the finally block below.
    } finally {
      /*
       * Step 2 — local cleanup.
       *
       * Always runs, even if the backend call threw or returned an error.
       * The cookies themselves are cleared server-side above; here we wipe
       * localStorage entirely (not just the known session key) so nothing —
       * session metadata, onboarding form data, anything added later — is left
       * behind for the next person to use this browser/device.
       */
      try {
        localStorage.clear();
      } catch {
        /* ignore storage unavailability */
      }
      setSessionState(null);
      router.push("/login");
    }
  }, [router]);

  const value = useMemo(
    () => ({
      role: session?.role ?? null,
      user: session?.user,
      tokenType: session?.tokenType,
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
