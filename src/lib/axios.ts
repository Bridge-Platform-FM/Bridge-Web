import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { toast } from "sonner";
import { clearTokens } from "@/lib/auth-tokens";
import { clearSession } from "@/lib/auth-session";
import { refreshAccessTokenOnce } from "@/lib/token-refresh";

/**
 * Shared axios instance for all API calls.
 * Base URL comes from NEXT_PUBLIC_API_BASE_URL (set in .env.local).
 *
 * `withCredentials` makes the browser send/receive the httpOnly auth cookies. The access
 * token is no longer attached via an Authorization header — the cookie travels automatically.
 */
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "",
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
  // timeout: 30000,
});

/** A normalized error shape surfaced to callers/UI. */
export interface ApiError {
  message: string;
  status?: number;
  data?: unknown;
}

// Guards against firing the logout/redirect more than once for a burst of 401s.
let isLoggingOut = false;

/** True for endpoints where a 401 is a real credential failure, NOT an expired session —
 *  so we never try to refresh (or logout-redirect) on them. */
function isAuthEndpoint(url?: string): boolean {
  if (!url) return false;
  return (
    url.includes("/auth/login") ||
    url.includes("/auth/mfa/") ||
    url.includes("/auth/refresh") ||
    url.includes("/auth/company-registration") ||
    url.includes("/reset-password")
  );
}

/**
 * On a truly-dead session (refresh failed): clear local state and bounce to sign-in.
 * Skipped on the auth screens themselves (a 401 there is a normal "wrong credentials").
 */
function handleUnauthorized() {
  if (typeof window === "undefined" || isLoggingOut) return;

  const path = window.location.pathname;
  if (
    path.startsWith("/login") ||
    path.startsWith("/admin/login") ||
    path.startsWith("/registration") ||
    path.startsWith("/reset-password")
  ) {
    return;
  }

  isLoggingOut = true;
  clearTokens();
  clearSession();
  toast.error("Your session has expired. Please sign in again.");
  window.location.href = path.startsWith("/admin") ? "/admin/login" : "/login";
}

// Normalize errors so callers get a predictable shape, and transparently refresh on 401.
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ message?: string }>) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    // Access token expired → refresh once (shared single-flight) and retry the original
    // request. Only for non-auth endpoints and only once per request.
    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !isAuthEndpoint(original.url)
    ) {
      original._retry = true;
      const refreshed = await refreshAccessTokenOnce();
      if (refreshed) {
        return api(original); // cookie was rotated server-side; browser sends the new one
      }
      handleUnauthorized();
    }

    let data: unknown = error.response?.data;
    if (data instanceof Blob) {
      try {
        const text = await data.text();
        data = text ? JSON.parse(text) : undefined;
      } catch {
        data = undefined;
      }
    }

    const normalized: ApiError = {
      // Show only the backend-provided message; fall back to a generic line so
      // raw axios/technical strings never reach the UI.
      message: (data as { message?: string } | undefined)?.message || "Something went wrong. Please try again.",
      status: error.response?.status,
      data,
    };
    return Promise.reject(normalized);
  }
);
