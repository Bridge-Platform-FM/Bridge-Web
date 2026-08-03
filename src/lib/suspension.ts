/**
 * Suspended-account detection + handoff to `/account-suspended`.
 *
 * The backend contract (Bridge-Server `middleware/authMiddleware.js`): every authenticated
 * request runs a suspension check, and a suspended user gets
 *
 *   403 { success: false,
 *         message: "Your account has been suspended. Please contact support.",
 *         data: { is_user_suspended: true, reason: string | null } }
 *
 * — and the response **clears the auth cookies**. Suspending also revokes every session
 * server-side, so an open tab hits this on its very next call.
 *
 * Because those cookies are gone by the time we redirect, that 403 body is the *only* chance
 * to learn the reason — a follow-up authenticated GET would just 401. So the interceptor
 * stashes what the API said (plus the name/email/role the session already held) and
 * `/account-suspended` renders it.
 *
 * The stash lives in **sessionStorage**: it's a one-screen handoff, and logout wipes
 * localStorage entirely (see AuthProvider), which would blank the page.
 */

const STORAGE_KEY = "bridge-platform.suspension";

/** Where a suspended account is sent. */
export const SUSPENDED_ROUTE = "/account-suspended";

/** What the suspension screen shows. Only `reason`/`message` come from the 403 itself. */
export interface SuspensionDetails {
  /** The backend's own message ("Your account has been suspended…"). */
  message?: string;
  /** Why it was suspended — `suspension_reason` from the admin who suspended the account. */
  reason?: string;
  /** Who it was, carried over from the session that just got cut off. */
  name?: string;
  email?: string;
  /** Raw backend role, shown as a chip. */
  role?: string;
}

/** Narrow an unknown payload to an indexable object without `any`. */
const asRecord = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" ? (v as Record<string, unknown>) : {};

/** Trimmed string, or undefined for anything else (the backend sends `reason: null`). */
const str = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim() : undefined;

/**
 * Is this error response the suspension block, and if so what did it say?
 * Returns `null` for anything else (an ordinary permissions failure must NOT redirect).
 *
 * Detection is the explicit `is_user_suspended` flag ONLY. Never match on the message text:
 * this path logs the user out and strands them on a dead-end screen, so an unrelated 403 that
 * happens to say "suspended" (a feature paused for maintenance, say) would sign out a healthy
 * account. A new endpoint that blocks a suspended user must send the flag.
 *
 * The flag — not the status code — is the contract. 403 is what the middleware sends today,
 * but 401 is accepted too: if that ever drifts, the frontend must not silently degrade to a
 * generic "session expired" toast that hides why the user was actually cut off.
 */
export function parseSuspension(status: number | undefined, data: unknown): SuspensionDetails | null {
  if (status !== 403 && status !== 401) return null;

  const body = asRecord(data);
  const inner = asRecord(body.data);

  // Both nesting levels, because responses vary in whether they wrap the payload in `data`.
  const suspended = inner.is_user_suspended === true || body.is_user_suspended === true;
  if (!suspended) return null;

  const message = str(body.message);

  return {
    message,
    reason: str(inner.reason) ?? str(body.reason),
  };
}

export function setSuspension(details: SuspensionDetails) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(details));
  } catch {
    /* ignore storage quota/availability errors — the page has fallback copy */
  }
}

export function getSuspension(): SuspensionDetails | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SuspensionDetails) : null;
  } catch {
    return null;
  }
}

export function clearSuspension() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
