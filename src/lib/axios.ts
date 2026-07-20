import axios, { AxiosError } from "axios";
import { toast } from "sonner";
import { getAccessToken, clearTokens } from "@/lib/auth-tokens";
import { clearSession } from "@/lib/auth-session";

/**
 * Shared axios instance for all API calls.
 * Base URL comes from NEXT_PUBLIC_API_BASE_URL (set in .env.local).
 */
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "",
  headers: { "Content-Type": "application/json" },
  // timeout: 30000,
});

// Attach the access token (issued at registration) so every later call is authenticated.
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  // Don't clobber an Authorization header a caller set explicitly per-request.
  if (token && !config.headers.Authorization) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/** A normalized error shape surfaced to callers/UI. */
export interface ApiError {
  message: string;
  status?: number;
  data?: unknown;
}

// Guards against firing the logout/redirect more than once for a burst of 401s.
let isLoggingOut = false;

/**
 * On an expired/invalid token (401) anywhere in the app: clear the stored tokens
 * + session and bounce to the sign-in screen. Skipped on the auth screens
 * themselves (a 401 there is a normal "wrong credentials", not a dead session).
 */
function handleUnauthorized() {
  if (typeof window === "undefined" || isLoggingOut) return;

  const path = window.location.pathname;
  if (
    path.startsWith("/login") ||
    path.startsWith("/admin/login") ||
    path.startsWith("/registration") ||
    // The reset flow uses a short-lived reset token; an expired one should surface
    // an inline error on the reset screen, not bounce the (logged-out) user away.
    path.startsWith("/reset-password")
  ) {
    return;
  }

  isLoggingOut = true;
  clearTokens();
  clearSession();
  toast.error("Your session has expired. Please sign in again.");
  // Send staff back to the admin sign-in, everyone else to the user sign-in.
  window.location.href = path.startsWith("/admin") ? "/admin/login" : "/login";
}

// Normalize errors so callers get a predictable shape.
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ message?: string }>) => {
    if (error.response?.status === 401) handleUnauthorized();

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
