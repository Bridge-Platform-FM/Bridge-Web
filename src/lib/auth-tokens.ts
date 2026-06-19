/**
 * Auth token storage — dedicated localStorage keys, separate from the onboarding blob.
 * Tokens are issued once both OTP channels are verified (registration completes).
 */

const ACCESS_TOKEN_KEY =
  process.env.NEXT_PUBLIC_ACCESS_TOKEN_KEY ?? "bridge-platform.accessToken";
const REFRESH_TOKEN_KEY =
  process.env.NEXT_PUBLIC_REFRESH_TOKEN_KEY ?? "bridge-platform.refreshToken";
const STORAGE_KEY = process.env.NEXT_PUBLIC_STORAGE_KEY ?? "bridge-platform.onboarding";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/** Persist the access + refresh tokens. */
export function setTokens({ accessToken, refreshToken }: AuthTokens) {
  try {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  } catch {
    /* ignore storage quota/availability errors */
  }
}

export function getAccessToken(): string | null {
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function clearTokens() {
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
