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
 * TODO(api): the current user's profileId is hard-coded for testing. Once the
 * backend exposes a token-derived route (e.g. `/matching/me`), drop the id and call
 * `API_ENDPOINTS.MATCHING_ME` instead — no component changes needed.
 */

/** Temporary: the profile to fetch matches for until `/matching/me` exists. */
// const EXPLORE_TEST_PROFILE_ID = 14;

/** Fetch the current profile's compatibility matches for the Explore views. */
export async function fetchExploreMatches(): Promise<ExploreMatch[]> {
  const { data } = await api.get<ExploreMatchesResponse>(
    API_ENDPOINTS.MATCHING(),
  );
  return data.data.matches;
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

//  Record a swipe decision (connect / skip / reject) for a matched profile.
//  TODO(api): POST to the connect/reject endpoint once available. For now this is a
//   no-op that resolves immediately so the deck advances optimistically.
 
export function submitExploreDecision(
  profileId: number,
  decision: ExploreDecision,
): Promise<void> {
  // No-op until the endpoint exists; referenced so the signature stays honest.
  void profileId;
  void decision;
  return Promise.resolve();
}
