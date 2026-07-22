/**
 * Auth tokens now live in httpOnly cookies set by the backend — JavaScript can no
 * longer read or write them (that's the point: XSS can't steal them). The server sets
 * them via Set-Cookie at login/verify-otp/refresh/registration and clears them at logout.
 *
 * Client-side identity the UI still needs (role, userId, name) lives in
 * `auth-session.ts` (non-sensitive, localStorage). This module only handles local
 * cleanup of the onboarding blob.
 */

const STORAGE_KEY = process.env.NEXT_PUBLIC_STORAGE_KEY ?? "bridge-platform.onboarding";

// Legacy localStorage keys tokens USED to live in (pre-cookie migration). Tokens are
// httpOnly cookies now, but a browser that logged in before the migration may still
// hold these — purge them defensively so no token lingers in localStorage.
const LEGACY_TOKEN_KEYS = [
  process.env.NEXT_PUBLIC_ACCESS_TOKEN_KEY ?? "bridge-platform.accessToken",
  process.env.NEXT_PUBLIC_REFRESH_TOKEN_KEY ?? "bridge-platform.refreshToken",
  process.env.NEXT_PUBLIC_MFA_TOKEN_KEY ?? "bridge-platform.mfaToken",
];

/** Remove any legacy token keys left in localStorage from before the cookie migration.
 *  Safe to call on every app load — tokens are httpOnly cookies now, so these should
 *  never exist; this just cleans up browsers that logged in before the migration. */
export function purgeLegacyTokens() {
  try {
    for (const key of LEGACY_TOKEN_KEYS) localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** Local cleanup — clears the onboarding blob and purges any legacy token keys.
 *  Auth cookies are cleared server-side on logout. */
export function clearTokens() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    purgeLegacyTokens();
  } catch {
    /* ignore */
  }
}
