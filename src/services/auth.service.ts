import { api } from "@/lib/axios";
import { API_ENDPOINTS } from "@/config/constant";
import type {
  RegisterPayload,
  RegisterResponse,
  LoginPayload,
  LoginResponse,
  SelectChannelPayload,
  SelectChannelResponse,
  VerifyMfaOtpPayload,
  VerifyMfaOtpResponse,
  VerifyOtpPayload,
  VerifyOtpResponse,
  ResendOtpPayload,
  ResendOtpResponse,
  SwitchRolePayload,
  SwitchRoleResponse,
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
 * Log in an existing user with email + password.
 * NOTE: swap the method/URL/body/headers here when the real curl is provided.
 */
export async function loginUser(payload: LoginPayload): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>(API_ENDPOINTS.LOGIN, payload);
  return data;
}

/**
 * Login MFA: send the chosen channel (EMAIL | PHONE) to the backend, which then
 * triggers the OTP send over that channel.
 * NOTE: swap the method/URL/body/headers here when the real curl is provided.
 */
export async function selectMfaChannel(payload: SelectChannelPayload): Promise<SelectChannelResponse> {
  const { data } = await api.post<SelectChannelResponse>(API_ENDPOINTS.MFA_SELECT_CHANNEL, payload);
  return data;
}

/**
 * Login MFA: verify the OTP the user entered for the chosen channel.
 * NOTE: swap the method/URL/body/headers here when the real curl is provided.
 */
export async function verifyMfaOtp(payload: VerifyMfaOtpPayload): Promise<VerifyMfaOtpResponse> {
  const { data } = await api.post<VerifyMfaOtpResponse>(API_ENDPOINTS.MFA_VERIFY_OTP, payload);
  return data;
}

/**
 * Switch the active user role. The backend re-issues a fresh access token scoped
 * to the chosen role; the caller persists the new tokens + role.
 * NOTE: swap the method/URL/body/headers here when the real curl is provided.
 */
export async function switchRole(payload: SwitchRolePayload): Promise<SwitchRoleResponse> {
  const { data } = await api.post<SwitchRoleResponse>(API_ENDPOINTS.SWITCH_ROLE, payload);
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

/**
 * Request a fresh OTP for a channel (mobile or email).
 * NOTE: swap the method/URL/body/headers here when the real curl is provided.
 */
export async function resendOtp(payload: ResendOtpPayload): Promise<ResendOtpResponse> {
  const { data } = await api.post<ResendOtpResponse>(API_ENDPOINTS.RESEND_OTP, payload);
  return data;
}
