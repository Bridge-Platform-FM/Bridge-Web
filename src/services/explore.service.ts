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
 * Backed by the live `GET /api/v1/matching` endpoint. The access token is
 * attached automatically by the axios interceptor.
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

/** Fetch the current profile's compatibility matches for the Explore views.
 *  Logs a 'shown' event for each match returned so the admin dashboard can track
 *  match volume, avg compatibility score, top sectors, and algorithm distribution. */
export async function fetchExploreMatches(): Promise<ExploreMatch[]> {
  const { data } = await api.get<ExploreMatchesResponse>(
    API_ENDPOINTS.MATCHING(),
  );
  const matches = data.data.matches;

  // Log 'shown' events for every match received — fire-and-forget
  matches.forEach((m) => {
    logEvent({
      matchProfileId:    m.profileId,
      action:            'shown',
      algorithmType:     'rule_based',   // update to 'ml_model' once ML engine is live
      compatibilityScore: m.compatibility ?? null,
      matchSector:       m.primary_sector?.[0] ?? null,
    });
  });

  return matches;
}

export interface ExploreConnectionLimit {
  remaining: number;
  total: number;
}

/** Daily connection-request allowance, from the same GET /api/v1/matching/profiles
 *  response fetchExploreMatches uses. Falls back to 50/50 only if the backend omits
 *  the fields entirely. */
export async function fetchExploreConnectionLimit(): Promise<ExploreConnectionLimit> {
  const { data } = await api.get<ExploreMatchesResponse>(API_ENDPOINTS.MATCHING());
  const total = data.data.requestLimit ?? 50;
  const remaining = data.data.requestsRemaining ?? total;
  return { remaining, total };
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