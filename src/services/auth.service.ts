import { api } from "@/lib/axios";
import { API_ENDPOINTS } from "@/config/constant";
import type {
  RegisterPayload,
  RegisterResponse,
  VerifyOtpPayload,
  VerifyOtpResponse,
} from "@/types/api.types";

/**
 * Register the company (step 1).
 *
 * NOTE: This is the single place to update when the real curl is provided —
 * swap the method/URL/body/headers here. Everything else stays the same.
 */
export async function registerCompany(payload: RegisterPayload): Promise<RegisterResponse> {
  const { data } = await api.post<RegisterResponse>(API_ENDPOINTS.REGISTER, payload);
  return data;
}

/**
 * Verify the mobile OTP (step 2).
 * NOTE: swap the method/URL/body/headers here when the real curl is provided.
 */
export async function verifyMobileOtp(payload: VerifyOtpPayload): Promise<VerifyOtpResponse> {
  const { data } = await api.post<VerifyOtpResponse>(API_ENDPOINTS.VERIFY_MOBILE_OTP, payload);
  return data;
}

/**
 * Verify the email OTP (step 2).
 * NOTE: swap the method/URL/body/headers here when the real curl is provided.
 */
export async function verifyEmailOtp(payload: VerifyOtpPayload): Promise<VerifyOtpResponse> {
  const { data } = await api.post<VerifyOtpResponse>(API_ENDPOINTS.VERIFY_EMAIL_OTP, payload);
  return data;
}
