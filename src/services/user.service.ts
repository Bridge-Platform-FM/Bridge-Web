import { api } from "@/lib/axios";
import { API_ENDPOINTS } from "@/config/constant";
import type { UserProfilePayload, BuildProfileResponse, UserSearchResult } from "@/types/api.types";

/**
 * Create the user profile (complete-profile step).
 *
 * The payload keys are the backend `user` table columns (snake_case); the role is
 * derived from the JWT on the server, so it is not sent in the body. Auth rides on
 * the httpOnly session cookie (the axios instance sets `withCredentials`).
 */
export async function buildProfile(payload: UserProfilePayload): Promise<BuildProfileResponse> {
  const { data } = await api.post<BuildProfileResponse>(API_ENDPOINTS.BUILD_PROFILE, payload);
  clearUserProfileCache();
  return data;
}

/** One field returned by GET /api/v1/users/profile. */
export interface ProfileField {
  label: string;    
  columnName: string;
  value: string | string[];
  isEditable: boolean;
  /** Input type: "string" | "number" | "url" | "email" | "textarea" | "array" | ... */
  type: string;
  /** Options available when type === "array" */
  options?: { value: string; label: string }[];
}

export interface GetProfileResponse {
  success?: boolean;
  message?: string;
  data?: ProfileField[];
}

export interface SaveProfileResponse {
  success?: boolean;
  message?: string;
  data?: unknown;
}

/**
 * Module-level cache for the CURRENT user's profile. It's session-stable, but several
 * unrelated components need it (My Profile, the Explore proposal modal, the public
 * profile page), so without this they each issue their own GET on every navigation.
 *
 * The *promise* is cached, not just the value, so simultaneous mounts — and React
 * StrictMode's double-invoke in dev — collapse into a single request. A rejection
 * evicts the entry immediately (see below) so a failed load never sticks and every
 * existing Retry button still works.
 */
let profileCache: { at: number; promise: Promise<GetProfileResponse> } | null = null;
const PROFILE_TTL_MS = 5 * 60_000;

/** Drop the cached profile. Called after a save, and on logout / role switch. */
export function clearUserProfileCache(): void {
  profileCache = null;
}

/**
 * Fetch the current user's profile fields from GET /api/v1/users/profile.
 * Auth rides on the httpOnly session cookie (`withCredentials`), not a header.
 *
 * Served from the module cache when it's younger than PROFILE_TTL_MS — call
 * `clearUserProfileCache()` after anything that changes the profile or the user.
 */
export function getUserProfile(): Promise<GetProfileResponse> {
  if (profileCache && Date.now() - profileCache.at < PROFILE_TTL_MS) {
    return profileCache.promise;
  }

  const promise = api
    .get<GetProfileResponse>(API_ENDPOINTS.GET_PROFILE)
    .then((res) => res.data)
    .catch((err) => {
      // Never cache a failure — drop the entry so the next call (a Retry button,
      // a remount) actually hits the network again.
      if (profileCache?.promise === promise) profileCache = null;
      throw err;
    });

  profileCache = { at: Date.now(), promise };
  return promise;
}

/**
 * Save / update the current user's profile (PUT /api/v1/users/profile).
 * API is not yet live — callers should show a toast rather than failing silently.
 */
export async function saveUserProfile(
  payload: Record<string, unknown>,
): Promise<SaveProfileResponse> {
  const { data } = await api.put<SaveProfileResponse>(API_ENDPOINTS.SAVE_PROFILE, payload);
  // The cached copy is now stale — the next getUserProfile() must refetch.
  clearUserProfileCache();
  return data;
}

/**
 * Navbar typeahead search (GET /api/v1/users/search?q=). Pass an AbortSignal so the
 * caller can cancel a stale in-flight request when the query changes again.
 */
export async function searchUsers(query: string, signal?: AbortSignal): Promise<UserSearchResult[]> {
  const { data } = await api.get<{ data?: UserSearchResult[] }>(API_ENDPOINTS.USERS_SEARCH, {
    params: { q: query },
    signal,
  });
  return data.data ?? [];
}

/**
 * Full role-scoped profile for one search result (GET /api/v1/users/role-details).
 * Returns the same `ProfileField[]` shape as `getUserProfile` (label/columnName/
 * value/isEditable/type), rendered read-only before sending a connection request.
 */
export async function getUserRoleDetails(params: {
  userId: string;
  companyId?: string;
  roleId: number;
}): Promise<ProfileField[]> {
  const { data } = await api.get<GetProfileResponse>(API_ENDPOINTS.USER_ROLE_DETAILS, { params });
  return data.data ?? [];
}