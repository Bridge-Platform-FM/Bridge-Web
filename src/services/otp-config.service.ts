import { api } from "@/lib/axios";
import { API_ENDPOINTS } from "@/config/constant";
import type { OtpConfig, OtpConfigPayload, OtpConfigResponse } from "@/types/api.types";
import type { ApiError } from "@/lib/axios";

/**
 * Normalise the server response — works for both array and single-object
 * shapes so the page doesn't have to care which format the server returns.
 */
function extractConfig(response: OtpConfigResponse): OtpConfig | null {
  const { data } = response;
  if (!data) return null;
  if (Array.isArray(data)) return data[0] ?? null;
  return data;
}

/**
 * GET /otp-config
 * Returns the single config record, or null when none exists yet.
 * The backend returns 404 when no record is found — we treat any 4xx as
 * "not found" (return null) so the page shows the create form.
 * 5xx errors still throw so the error screen shows correctly.
 */
export async function getOtpConfig(): Promise<OtpConfig | null> {
  try {
    const { data } = await api.get<OtpConfigResponse>(API_ENDPOINTS.OTP_CONFIG);
    return extractConfig(data);
  } catch (err) {
    const error = err as ApiError;
    if (error.status && error.status < 500) {
      return null;
    }
    throw err;
  }
}

/**
 * POST /otp-config
 * Returns the created config record AND the backend's response message.
 */
export async function createOtpConfig(
  payload: OtpConfigPayload
): Promise<{ config: OtpConfig; message: string }> {
  const { data } = await api.post<OtpConfigResponse>(API_ENDPOINTS.OTP_CONFIG, payload);
  const config = extractConfig(data);
  if (!config) throw new Error("No config returned after create.");
  return { config, message: data.message ?? "OTP config created." };
}

/**
 * PUT /otp-config/:id
 * Returns the updated config record AND the backend's response message.
 */
export async function updateOtpConfig(
  id: number,
  payload: OtpConfigPayload
): Promise<{ config: OtpConfig; message: string }> {
  const { data } = await api.put<OtpConfigResponse>(
    `${API_ENDPOINTS.OTP_CONFIG}/${id}`,
    payload
  );
  const config = extractConfig(data);
  if (!config) throw new Error("No config returned after update.");
  return { config, message: data.message ?? "OTP config saved." };
}

/**
 * DELETE /otp-config/:id
 * Returns the backend's response message.
 * Falls back to a default string if the server returns 204 No Content.
 */
export async function deleteOtpConfig(id: number): Promise<{ message: string }> {
  const response = await api.delete<{ success?: boolean; message?: string }>(
    `${API_ENDPOINTS.OTP_CONFIG}/${id}`
  );
  return { message: response.data?.message ?? "OTP config deleted." };
}
