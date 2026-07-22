import axios from "axios";
import { API_ENDPOINTS } from "@/config/constant";

/**
 * Single-flight access-token refresh, shared by the axios interceptor AND the deal-room
 * socket so a burst of 401s / a socket reconnect never fire more than one refresh call.
 *
 * The refresh token rides in an httpOnly cookie — we never read it in JS. We just POST to
 * the refresh endpoint with credentials; the browser attaches the cookie and the server
 * responds with a fresh `accessToken` cookie (Set-Cookie). Resolves to true on success,
 * false if the refresh failed (caller then logs out).
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

let inFlight: Promise<boolean> | null = null;

export function refreshAccessTokenOnce(): Promise<boolean> {
  if (inFlight) return inFlight;

  inFlight = axios
    // A BARE axios call (not the shared `api` instance) so the response interceptor
    // can't recurse if the refresh itself 401s. Empty body — the cookie carries the token.
    .post(`${BASE_URL}${API_ENDPOINTS.REFRESH}`, {}, { withCredentials: true })
    .then(() => true)
    .catch(() => false)
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}
