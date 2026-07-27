import { api } from "@/lib/axios";
import { API_ENDPOINTS } from "@/config/constant";
import type { UserProfilePayload, BuildProfileResponse, UserSearchResult } from "@/types/api.types";

/**
 * Create the user profile (complete-profile step).
 *
 * The payload keys are the backend `user` table columns (snake_case); the role is
 * derived from the JWT on the server, so it is not sent in the body. The access
 * token issued at registration is attached automatically by the axios interceptor.
 */
export async function buildProfile(payload: UserProfilePayload): Promise<BuildProfileResponse> {
  const { data } = await api.post<BuildProfileResponse>(API_ENDPOINTS.BUILD_PROFILE, payload);
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
 * Fetch the current user's profile fields from GET /api/v1/users/profile.
 * The access token is attached automatically by the axios interceptor.
 */
export async function getUserProfile(): Promise<GetProfileResponse> {
  const { data } = await api.get<GetProfileResponse>(API_ENDPOINTS.GET_PROFILE);
  return data;
}

/**
 * Save / update the current user's profile (PUT /api/v1/users/profile).
 * API is not yet live — callers should show a toast rather than failing silently.
 */
export async function saveUserProfile(
  payload: Record<string, unknown>,
): Promise<SaveProfileResponse> {
  const { data } = await api.put<SaveProfileResponse>(API_ENDPOINTS.SAVE_PROFILE, payload);
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