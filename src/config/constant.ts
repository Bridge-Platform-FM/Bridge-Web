
/** Path prefix per API group — change/add groups here. */
const AUTH = "/api/v1/auth";
const ADMIN_AUTH = "/api/v1/admin/auth";
const SUPERADMIN_AUTH = "/api/v1/superadmin/auth";
const FILE = "/api/v1/file";
const USERS = "/api/v1/users";
// const KYC = "/api/v1/kyc";
// Admin/super-admin back-office (User Management + KYC Review).
const ADMIN = "/api/v1/admin";
// Matching Engine (Explore — compatibility matches).
const MATCHING = "/api/v1/matching";
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
  // Password reset (standalone flow, all portals): trigger an OTP to the email,
  // verify it (returns a short-lived reset access token), then set the new password.
  RESET_PASSWORD_TRIGGER_OTP: `${AUTH}/reset-password/trigger-otp`,
  RESET_PASSWORD_VERIFY_OTP: `${AUTH}/reset-password/verify-otp`,
  RESET_PASSWORD: `${AUTH}/reset-password`,
  // Admin auth — same login + MFA flow, admin-prefixed paths.
  ADMIN_LOGIN: `${ADMIN_AUTH}/login`,
  ADMIN_MFA_SELECT_CHANNEL: `${ADMIN_AUTH}/mfa/trigger-otp`,
  ADMIN_MFA_VERIFY_OTP: `${ADMIN_AUTH}/mfa/verify-otp`,
  // Super-admin auth — same login + MFA flow, superadmin-prefixed paths.
  SUPERADMIN_LOGIN: `${SUPERADMIN_AUTH}/login`,
  SUPERADMIN_MFA_SELECT_CHANNEL: `${SUPERADMIN_AUTH}/mfa/trigger-otp`,
  SUPERADMIN_MFA_VERIFY_OTP: `${SUPERADMIN_AUTH}/mfa/verify-otp`,
  // Switch the active user role — backend re-issues a new access token for the
  // chosen role. TODO: confirm the real path/shape from the curl.
  SWITCH_ROLE: `${AUTH}/switch-role`,
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

  // ----- Admin / Super-Admin back-office -----
  // User Management list + detail. TODO: replace with the real paths from the curl.
  ADMIN_USERS: `${ADMIN}/get-user-list`,
  ADMIN_USER_DETAIL: (id: string) => `${ADMIN}/users/${id}`,
  // KYC Review list — returns every user with their `kyc_documents` inline, so the
  // review drawer reuses the list row (no separate detail endpoint).
  ADMIN_KYC: `${ADMIN}/get-user-kyc_docs`,
  // Approve / reject one document (PUT, body: { kyc_id, action: "approve"|"reject" }).
  ADMIN_KYC_DOC_ACTION: `${ADMIN}/kyc/document-action`,
  // Approve / reject a whole submission (PUT, body: { company_id, action, rejection_reason? }).
  ADMIN_KYC_REVIEW_ACTION: `${ADMIN}/kyc/review-action`,

  // ----- Matching Engine (Explore) -----
  // Compatibility matches for a profile. TODO: switch to `${MATCHING}/me`
  // (token-derived) once the backend supports it; for now the profileId is passed.
  MATCHING: () => `${MATCHING}/profiles`,

  // ----- User Profile -----
  // Fetch the current user's profile fields (GET).
  GET_PROFILE: `${USERS}/profile`,
  // Save/update the current user's profile fields (PUT). API is not yet live.
  SAVE_PROFILE: `${USERS}/profile`,
} as const;
