import { api } from "@/lib/axios";
import { API_ENDPOINTS } from "@/config/constant";
import type {
  SessionLimitStatusResponse,
  RevokeSelectedSessionsPayload,
  RevokeSelectedSessionsResponse,
} from "@/types/api.types";

/**
 * Check whether the signed-in user has reached their active-session limit.
 * Called after MFA OTP verification, before redirecting to the dashboard.
 *
 * The access token is automatically attached by the shared axios request
 * interceptor — no extra headers needed at the call site.
 *
 * Response shapes:
 *   atLimit: false → proceed to dashboard as normal.
 *   atLimit: true  → show the session-chooser modal with `activeSessions`.
 */
export async function getSessionLimitStatus(): Promise<SessionLimitStatusResponse> {
  const { data } = await api.get<SessionLimitStatusResponse>(
    API_ENDPOINTS.SESSION_LIMIT_STATUS,
  );
  return data;
}

/**
 * Revoke the sessions identified by the supplied IDs. Called from the session-
 * chooser modal after the user selects one or more devices to log out.
 *
 * The access token is automatically attached by the shared axios request
 * interceptor. On success the caller closes the modal and redirects to the
 * dashboard. On error the caller shows the backend message inside the modal.
 *
 * NOTE: swap the method/URL/body/headers here when the real curl is provided.
 */
export async function revokeSelectedSessions(
  payload: RevokeSelectedSessionsPayload,
): Promise<RevokeSelectedSessionsResponse> {
  const { data } = await api.post<RevokeSelectedSessionsResponse>(
    API_ENDPOINTS.REVOKE_SELECTED_SESSIONS,
    payload,
  );
  return data;
}

/**
 * Log out the current session. Best-effort: the backend revokes this session row and
 * clears the httpOnly auth cookies (the cookie is sent automatically via withCredentials).
 * Callers wrap this in try/catch so a failure never blocks local logout.
 */
export async function logoutSession(): Promise<void> {
  await api.post(API_ENDPOINTS.SESSION_LOGOUT, {});
}
