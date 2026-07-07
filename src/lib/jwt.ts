/**
 * Minimal JWT payload access — no external dependency. The backend signs the access
 * token with `userId`, `roleId`, `role`, `companyId`, etc. (see Bridge-Server
 * tokenService). We only ever READ the payload client-side (never trust it for auth —
 * the server re-verifies), e.g. to know the current user's id for the Deal Room:
 * picking the counterparty and marking a message as mine vs theirs.
 */

import { getAccessToken } from "./auth-tokens";

/** Base64url-decode + JSON-parse a JWT's payload segment. Returns null if malformed. */
function decodePayload(token: string): Record<string, unknown> | null {
  const part = token.split(".")[1];
  if (!part) return null;
  try {
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const json = typeof atob === "function" ? atob(base64) : Buffer.from(base64, "base64").toString("utf8");
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** The current user's numeric id from the stored access token, or null if unavailable. */
export function getCurrentUserId(): number | null {
  const token = getAccessToken();
  if (!token) return null;
  const payload = decodePayload(token);
  const id = payload?.userId;
  return typeof id === "number" ? id : typeof id === "string" && id !== "" ? Number(id) : null;
}
