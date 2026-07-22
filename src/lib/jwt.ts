/**
 * Current-user identity for the client UI.
 *
 * The access token is now an httpOnly cookie, so JavaScript can no longer decode it.
 * The user id is instead carried in the (non-sensitive) session, populated at verify-otp
 * from the backend response. Used e.g. in the Deal Room to pick the counterparty and mark
 * a message/offer as mine vs theirs. Never trusted for auth — the server re-verifies.
 */

import { getSession } from "./auth-session";

/** The current user's numeric id from the stored session, or null if unavailable. */
export function getCurrentUserId(): number | null {
  const id = getSession()?.user?.userId;
  return typeof id === "number" ? id : typeof id === "string" && id !== "" ? Number(id) : null;
}
