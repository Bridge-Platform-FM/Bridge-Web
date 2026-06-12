
/** Path prefix per API group — change/add groups here. */
const AUTH = "/api/v1/auth";
const FILE = "/api/v1/file";
const USERS = "/api/v1/users";
// const KYC = "/api/v1/kyc";
/** API endpoint paths (relative to NEXT_PUBLIC_API_BASE_URL host). */
export const API_ENDPOINTS = {
  // TODO: replace with the real register path from the curl.
  REGISTER: `${AUTH}/company-registration`,
  // TODO: replace with the real login path from the curl.
  LOGIN: `${AUTH}/login`,
  // Login MFA: client sends the chosen channel; backend triggers the OTP send.
  MFA_SELECT_CHANNEL: `${AUTH}/mfa/trigger-otp`,
  // Login MFA: verify the OTP the user entered for the chosen channel.
  MFA_VERIFY_OTP: `${AUTH}/mfa/verify-otp`,
  // TODO: replace with the real OTP verify paths from the curls.
  VERIFY_MOBILE_OTP: `${AUTH}/verify-otp`,
  VERIFY_EMAIL_OTP: `${AUTH}/verify-otp`,
  RESEND_OTP: `${AUTH}/resend-otp`,
  // Virus-scan + S3 upload (returns { s3Key }).
  SCAN_IMG: `${FILE}/scan-img`,
  SCAN_DOCUMENT: `${FILE}/scan-document`,
  // Watermarked file preview (returns raw bytes for a given s3Key).
  FILE_PREVIEW: `${FILE}/file-preview`,
  // Create the user profile (complete-profile step). Requires a valid JWT.
  BUILD_PROFILE: `${USERS}/build-profile`,
  // TODO: replace with the real save-kyc-info path from the curl.
  SAVE_KYC_INFO: `${FILE}/save-kyc-info`,
  // Fetch the submitted KYC docs + submission/expiry timestamps (verification-status step).
  GET_KYC_DOCS: `${FILE}/get-kyc-docs`,
} as const;
