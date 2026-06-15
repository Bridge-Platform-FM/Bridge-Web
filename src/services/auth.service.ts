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

/** Which login portal a request targets — selects the endpoint group below. */
export type Portal = "user" | "admin" | "superadmin";

/**
 * Resolve the login + MFA endpoints for a portal from API_ENDPOINTS (the single
 * source of the path strings). All three portals share identical request/response
 * shapes and differ only by path.
 */
const AUTH_BY_PORTAL: Record<Portal, { LOGIN: string; MFA_SELECT_CHANNEL: string; MFA_VERIFY_OTP: string }> = {
  user: {
    LOGIN: API_ENDPOINTS.LOGIN,
    MFA_SELECT_CHANNEL: API_ENDPOINTS.MFA_SELECT_CHANNEL,
    MFA_VERIFY_OTP: API_ENDPOINTS.MFA_VERIFY_OTP,
  },
  admin: {
    LOGIN: API_ENDPOINTS.ADMIN_LOGIN,
    MFA_SELECT_CHANNEL: API_ENDPOINTS.ADMIN_MFA_SELECT_CHANNEL,
    MFA_VERIFY_OTP: API_ENDPOINTS.ADMIN_MFA_VERIFY_OTP,
  },
  superadmin: {
    LOGIN: API_ENDPOINTS.SUPERADMIN_LOGIN,
    MFA_SELECT_CHANNEL: API_ENDPOINTS.SUPERADMIN_MFA_SELECT_CHANNEL,
    MFA_VERIFY_OTP: API_ENDPOINTS.SUPERADMIN_MFA_VERIFY_OTP,
  },
};

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
 *
 * The `portal` selects which backend endpoint group to hit (user / admin /
 * superadmin) — all three share this identical payload + response shape.
 * NOTE: swap the method/URL/body/headers here when the real curl is provided.
 */
export async function loginUser(payload: LoginPayload, portal: Portal = "user"): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>(AUTH_BY_PORTAL[portal].LOGIN, payload);
  return data;
}

/**
 * Login MFA: send the chosen channel (EMAIL | PHONE) to the backend, which then
 * triggers the OTP send over that channel. `portal` selects the endpoint group.
 * NOTE: swap the method/URL/body/headers here when the real curl is provided.
 */
export async function selectMfaChannel(
  payload: SelectChannelPayload,
  portal: Portal = "user",
): Promise<SelectChannelResponse> {
  const { data } = await api.post<SelectChannelResponse>(AUTH_BY_PORTAL[portal].MFA_SELECT_CHANNEL, payload);
  return data;
}

/**
 * Login MFA: verify the OTP the user entered for the chosen channel. `portal`
 * selects the endpoint group.
 * NOTE: swap the method/URL/body/headers here when the real curl is provided.
 */
export async function verifyMfaOtp(
  payload: VerifyMfaOtpPayload,
  portal: Portal = "user",
): Promise<VerifyMfaOtpResponse> {
  const { data } = await api.post<VerifyMfaOtpResponse>(AUTH_BY_PORTAL[portal].MFA_VERIFY_OTP, payload);
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
