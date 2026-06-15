/**
 * Post-auth session store — the user's role and basic profile info, kept in
 * localStorage alongside (but separate from) the auth tokens and the onboarding
 * blob. The role comes from the login response; we read it here to render the
 * role-specific dashboard. Mirrors the auth-tokens.ts pattern.
 */

import type { Role } from "@/lib/roles";
import { isRole } from "@/lib/roles";

const SESSION_KEY =
  process.env.NEXT_PUBLIC_SESSION_KEY ?? "bridge-platform.session";

/** Lightweight user info echoed back by the backend (all optional). */
export interface SessionUser {
  name?: string;
  email?: string;
  organizationName?: string;
}

export interface Session {
  role: Role;
  user?: SessionUser;
}

/** Persist the current session (role + optional user info). */
export function setSession(session: Session) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* ignore storage quota/availability errors */
  }
}

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!isRole(parsed?.role)) return null;
    return { role: parsed.role, user: parsed.user };
  } catch {
    return null;
  }
}

export function getRole(): Role | null {
  return getSession()?.role ?? null;
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}
