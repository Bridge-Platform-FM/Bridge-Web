import { api } from "@/lib/axios";
import { API_ENDPOINTS } from "@/config/constant";
import type {
  ExploreDecision,
  ExploreMatch,
  ExploreMatchesResponse,
} from "@/types/api.types";

/**
 * Explore data — the Matching Engine results powering the swipe deck + grid.
 *
 * Backed by the live `GET /api/v1/matching` endpoint; auth rides on the httpOnly
 * session cookie (the axios instance sets `withCredentials`).
 *
 * Matching events are logged to the backend (POST /api/v1/matching/events)
 * fire-and-forget so analytics never block the user experience.
 */

/** Map frontend swipe decisions to backend matching_events action strings. */
const DECISION_ACTION: Record<ExploreDecision, string> = {
  send:   'connection_sent',
  skip:   'skipped',
  reject: 'irrelevant_flag',  // stronger negative signal than skip
};

/**
 * Fire-and-forget helper: log a matching event without blocking the UX.
 * Swallows all errors so the explore page is never affected by analytics failures.
 */
function logEvent(payload: {
  matchProfileId: string;
  action: string;
  algorithmType?: string;
  compatibilityScore?: number | null;
  matchSector?: string | null;
}): void {
  api.post(API_ENDPOINTS.MATCHING_LOG_EVENT, payload).catch(() => {
    // Silent — analytics must never block user flows
  });
}

/** Daily connection-request allowance. Carried on the same response as the matches —
 *  it is NOT a separate endpoint. */
export interface ExploreConnectionLimit {
  remaining: number;
  total: number;
}

export interface ExploreMatchesResult {
  matches: ExploreMatch[];
  limit: ExploreConnectionLimit;
}

/** Log a 'shown' event for each match so the admin dashboard can track match volume,
 *  avg compatibility score, top sectors and algorithm distribution.
 *
 *  Kept separate from `fetchExploreMatches` (rather than fired inside it) so re-reading
 *  or re-rendering the match list never re-emits the whole burst — the caller decides
 *  exactly once, when a fresh list arrives. Fire-and-forget. */
export function logMatchesShown(matches: ExploreMatch[]): void {
  matches.forEach((m) => {
    logEvent({
      matchProfileId:    m.profileId,
      action:            'shown',
      algorithmType:     'rule_based',   // update to 'ml_model' once ML engine is live
      compatibilityScore: m.compatibility ?? null,
      matchSector:       m.primary_sector?.[0] ?? null,
    });
  });
}

/** Fetch the current profile's compatibility matches for the Explore views, together
 *  with the daily connection-request allowance that rides on the same response.
 *
 *  Both the deck/grid and the allowance ring used to call this endpoint separately,
 *  which downloaded the identical payload twice per page visit — they now share this
 *  single call (see ExploreView). The `?? 50` fallbacks apply only if the backend
 *  omits the limit fields entirely. */
export async function fetchExploreMatches(): Promise<ExploreMatchesResult> {
  const { data } = await api.get<ExploreMatchesResponse>(
    API_ENDPOINTS.MATCHING(),
  );
  const total = data.data.requestLimit ?? 50;
  return {
    matches: data.data.matches,
    limit: { total, remaining: data.data.requestsRemaining ?? total },
  };
}

/**
 * Record a swipe decision (connect / skip / reject) for a matched profile.
 * Now actively posts to POST /api/v1/matching/events to power the behavioral
 * signal breakdown in the Matching Engine Dashboard (FRD 12.3).
 *
 * send   → 'connection_sent'  (positive signal)
 * skip   → 'skipped'          (mild negative signal)
 * reject → 'irrelevant_flag'  (strong negative signal)
 */
export async function submitExploreDecision(
  profileId: string,
  decision: ExploreDecision,
): Promise<void> {
  await api.post(API_ENDPOINTS.MATCHING_LOG_EVENT, {
    matchProfileId: profileId,
    action:         DECISION_ACTION[decision] ?? 'skipped',
  });
}