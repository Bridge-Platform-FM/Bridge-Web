import { api } from "@/lib/axios";
import { API_ENDPOINTS } from "@/config/constant";
import type { UserProfilePayload, BuildProfileResponse } from "@/types/api.types";

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
