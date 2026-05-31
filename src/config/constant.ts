/** API endpoint paths (relative to NEXT_PUBLIC_API_BASE_URL). */
export const API_ENDPOINTS = {
  // TODO: replace with the real register path from the curl.
  REGISTER: "/company-registration",
  // TODO: replace with the real OTP verify paths from the curls.
  VERIFY_MOBILE_OTP: "/verify-otp",
  VERIFY_EMAIL_OTP: "/verify-otp",
} as const;
