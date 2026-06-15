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
import { setTokens, clearTokens } from "@/lib/auth-tokens";
import { switchRole as switchRoleRequest } from "@/services/auth.service";

interface AuthContextValue {
  role: Role | null;
  user: SessionUser | undefined;
  /** True once the persisted session has been read from localStorage. */
  isLoaded: boolean;
  /** Persist a session (e.g. right after login). */
  setSession: (session: Session) => void;
  /** Switch the active role: backend re-issues a token, then we re-render. */
  switchRole: (target: Role) => Promise<void>;
  /** Clear tokens + session and return to the login screen. */
  logout: () => void;
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

  const logout = useCallback(() => {
    clearTokens();
    clearSession();
    setSessionState(null);
    router.push("/login");
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
