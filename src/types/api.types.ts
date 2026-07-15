/** Payload sent when registering a company (step 1). Field names/values match the backend schema. */
export interface RegisterPayload {
  companyName: string;
  email: string;
  // countryCode currently not sent — kept optional so it can be re-enabled later.
  countryCode?: string;
  phoneNumber: string;
  password: string;
  role: "INVESTOR" | "B2B" | "STARTUP";
  termsAccepted: boolean;
  gstNumber?: string;
  cinNumber?: string;
}

/** Response from the register endpoint. Tokens are issued here now (OTP is sent in parallel). */
export interface RegisterResponse {
  success?: boolean;
  message?: string;
  data?: { accessToken: string; refreshToken: string };
}

import type { Role } from "@/lib/roles";

/** Payload sent when logging in. Field names/values match the backend schema. */
export interface LoginPayload {
  email: string;
  password: string;
}

/**
 * Response from the login endpoint. Tokens authenticate subsequent requests;
 * `redirectTo` is the route the backend wants the client to land on (e.g. the
 * next pending onboarding step or the home dashboard).
 */
export interface LoginResponse {
  success?: boolean;
  message?: string;
  data?: {
    accessToken: string;
    refreshToken: string;
    redirectTo?: string;
    /** Raw role string from the backend (e.g. "INVESTOR"); normalize via normalizeRole. */
    role?: string;
    /** Authenticated user's name, when the backend echoes it on login. */
    first_name?: string | null;
    last_name?: string | null;
    /** Already-masked contact info for display on the verification-channel screen. */
    maskedMobile?: string;
    maskedEmail?: string;
  };
}

/** Payload for switching the active user role (re-issues a token for that role). */
export interface SwitchRolePayload {
  role: Role;
}

/** Response from the switch-role endpoint — new tokens + the now-active role. */
export interface SwitchRoleResponse {
  success?: boolean;
  message?: string;
  data?: {
    accessToken: string;
    refreshToken: string;
    /** Raw role string from the backend; normalize via normalizeRole. */
    role?: string;
  };
}

/**
 * Login MFA channel selection. The client only sends the chosen channel; the
 * backend then triggers the OTP send over that channel.
 */
export interface SelectChannelPayload {
  channel: "EMAIL" | "PHONE";
}

/** Response from the MFA select-channel endpoint. */
export interface SelectChannelResponse {
  success?: boolean;
  message?: string;
  data?: unknown;
}

/**
 * Login MFA OTP verification. `channel` uses the same enum as registration; the
 * user is already authenticated (token), so only the channel + code are sent.
 */
export interface VerifyMfaOtpPayload {
  channel: "EMAIL" | "PHONE";
  otp: string;
}

/** Response from the MFA verify-otp endpoint. */
export interface VerifyMfaOtpResponse {
  success?: boolean;
  message?: string;
  data?: {
    /** Route the backend wants the client to land on after verification. */
    redirectRoute?: string;
    /** Authenticated user's profile, echoed back on successful verification. */
    first_name?: string | null;
    last_name?: string | null;
    /** Raw role string (e.g. "STARTUP"); normalize via normalizeRole. */
    role?: string | null;
  };
}

/* ---- Password reset (standalone flow, all portals) ---- */

/** Step 1: request an OTP to the account email. */
export interface ResetPasswordTriggerOtpPayload {
  email: string;
}
export interface ResetPasswordTriggerOtpResponse {
  success?: boolean;
  message?: string;
  data?: unknown;
}

/** Step 2: verify the emailed OTP; returns a short-lived reset access token. */
export interface ResetPasswordVerifyOtpPayload {
  email: string;
  otp: string;
}
export interface ResetPasswordVerifyOtpResponse {
  success?: boolean;
  message?: string;
  data?: {
    /** Short-lived RESET_PASSWORD_ACCESS_TOKEN used to authorize the reset call. */
    accessToken: string;
  };
}

/** Step 3: set the new password (authorized by the reset access token). */
export interface ResetPasswordPayload {
  newPassword: string;
}
export interface ResetPasswordResponse {
  success?: boolean;
  message?: string;
  data?: unknown;
}

/** Payload for verifying a one-time code. Field names/values match the backend schema. */
export interface VerifyOtpPayload {
  /** Which channel the code was sent over. */
  channel: "EMAIL" | "PHONE";
  otp: string;
  /** Required when channel is EMAIL. */
  email?: string;
  /** Required when channel is PHONE. */
  phoneNumber?: string;
}

/** Payload for requesting a fresh OTP. Field names/values match the backend schema. */
export interface ResendOtpPayload {
  /** Which channel to resend the code over. */
  channel: "EMAIL" | "PHONE";
  /** Required when channel is EMAIL. */
  email?: string;
  /** Required when channel is PHONE. */
  phoneNumber?: string;
}

/** Response from the resend-otp endpoint. data is an empty array on success. */
export interface ResendOtpResponse {
  success?: boolean;
  message?: string;
  data?: unknown[];
}

/** Response from an OTP verify endpoint. Tokens are issued at registration, not here; data is an empty array on success. */
export interface VerifyOtpResponse {
  success?: boolean;
  message?: string;
  data?: unknown[];
}

/** Result of a virus scan + S3 upload (`/file/scan-img` | `/file/scan-document`). */
export interface ScanResult {
  /** S3 object key of the stored file; sent back to the backend with the submit payload. */
  s3Key: string;
}

/**
 * Complete-profile payload — keys match the backend `user` table columns exactly
 * (snake_case, flat). All optional: only the fields relevant to the user's role are
 * sent. NOTE: some keys intentionally mirror backend spelling quirks
 * (`prefrerred_investment_stage`, `export_rediness`, `products_ervice_Offered`).
 */
export interface UserProfilePayload {
  // basic
  first_name?: string;
  last_name?: string;
  profile_photo?: string;
  short_bio?: string;
  country?: string;
  continent?: string;
  organization_name?: string;
  mobile_number?: string;
  company_email?: string;
  linkedin_profile_url?: string;
  company_website_url?: string;
  primary_sector?: string[];
  // startup
  startup_industry_sector?: string[];
  funding_stage?: string;
  funding_currency?: string;
  funding_ask_amt_min?: number;
  funding_ask_amt_max?: number;
  use_of_funds?: string;
  team_size_min?: number;
  team_size_max?: number;
  incorporation_certificate?: string;
  pitch_deck_certificate?: string;
  business_description?: string;
  startup_intent?: string;
  // investor
  ticket_size_amt_min?: number;
  ticket_size_amt_max?: number;
  prefrerred_investment_stage?: string[];
  investor_sector_preference?: string[];
  geographic_investment_preference?: string[];
  investor_type?: string;
  investor_portfolio_overview?: string;
  number_of_investments_to_date?: number;
  investor_intent?: string;
  // b2b
  b2b_sector?: string;
  b2b_sub_sector?: string;
  industry_vertical?: string;
  revenue_band?: string;
  min_order_quantity?: number;
  export_rediness?: string;
  years_in_operation?: number;
  products_ervice_Offered?: string;
  business_requirements?: string;
  b2b_intent?: string;
}

/** Response from `/users/build-profile`. */
export interface BuildProfileResponse {
  success?: boolean;
  message?: string;
  data?: unknown;
}

/**
 * One uploaded file inside a KYC document. `s3_key` comes from the scan upload;
 * `mimetype` / `file_name` / `file_size` describe the uploaded file (the same file
 * the scan API received).
 */
export interface KycDocFile {
  s3_key: string;
  mimetype: string;
  file_name: string;
  file_size: number;
}

/**
 * Payload for `/kyc/save-kyc-info` (document-upload step). Each document carries its
 * typed `number` plus one file object per side. Aadhaar is two-sided (front + back);
 * PAN is single-sided (front only). `number` is sent as a string to preserve PAN's
 * alphanumeric format and Aadhaar's 12 digits / leading zeros.
 */
export interface SaveKycInfoPayload {
  AADHAAR: {
    number: string;
    front: KycDocFile;
    back: KycDocFile;
  };
  PAN: {
    number: string;
    front: KycDocFile;
  };
}

/** Response from `/kyc/save-kyc-info`. */
export interface SaveKycInfoResponse {
  success?: boolean;
  message?: string;
  data?: unknown;
}
/**
 * One stored KYC document side returned by `/file/get-kyc-docs`. Carries the same
 * fields the scan upload produced plus the review status the backend tracks.
 */
export interface KycDocEntry {
  number: string;
  front?: KycDocFile;
  back?: KycDocFile;
  status?: string;
  rejection_reason?: string | null;
  verified_at?: string | null;
  verified_by?: string | null;
}

/**
 * Stored KYC documents returned by `/file/get-kyc-docs`. The backend sends an array of
 * single-key objects (one per document type), e.g. `[{ AADHAAR: … }, { PAN: … }]`.
 */
export type KycDocDetails = Array<Partial<Record<"AADHAAR" | "PAN", KycDocEntry>>>;

export interface GetKycDocsResponse {
  docDetails: KycDocDetails;
  /** ISO 8601 timestamp of when the documents were submitted. */
  submissionTime: string;
  /** ISO 8601 timestamp of when the review window expires (drives the countdown). */
  expiryTime: string;
}

/* ===========================================================================
 * Session Management
 * Shapes used by the active-session limit check and session-chooser modal that
 * runs between MFA OTP verification and the dashboard redirect.
 * ======================================================================== */

/** One active device session returned by GET /api/v1/sessions/limit-status. */
export interface ActiveSession {
  id: string;
  deviceName: string;
  browser: string;
  os: string;
  ipAddress: string;
  /** ISO 8601 timestamp of the most recent activity on this session. */
  lastActivityAt: string;
  /** ISO 8601 timestamp of when this session was originally created. */
  createdAt: string;
}

/**
 * Response from GET /api/v1/sessions/limit-status. Called after MFA verification
 * succeeds. When `atLimit` is true the session-chooser modal is shown; when false
 * the client proceeds to the dashboard immediately.
 *
 * Note: `activeSessions` never includes the user's current (just-created) session —
 * the backend excludes it. Every item in the list is safe to display as-is.
 */
export interface SessionLimitStatusResponse {
  success?: boolean;
  message?: string;
  data?: {
    /** True when the user has hit the concurrent-session ceiling. */
    atLimit: boolean;
    /**
     * Existing sessions the user may choose to revoke. Empty array when
     * `atLimit` is false.
     */
    activeSessions: ActiveSession[];
  };
}

/** Payload for POST /api/v1/sessions/revoke-selected. */
export interface RevokeSelectedSessionsPayload {
  sessionIds: string[];
}

/** Response from POST /api/v1/sessions/revoke-selected. */
export interface RevokeSelectedSessionsResponse {
  success?: boolean;
  message?: string;
}

/* ===========================================================================
 * Admin / Super-Admin back-office (User Management + KYC Review).
 * Fields are optional/tolerant like the rest of this file — the service layer
 * normalizes the raw backend shape into these before the UI consumes them.
 * ======================================================================== */

/** KYC verification state used across User Management + KYC Review. */
export type KycStatus = "VERIFIED" | "PENDING" | "REJECTED";

/**
 * One row in the User Management table, normalized from the `get-user-list`
 * response. Keyed by `company_email`; `userId` carries the numeric PK needed
 * for per-user admin operations (e.g. limit-config).
 */
export interface AdminUserListItem {
  /** Stable identifier — `company_email`. */
  id: string;
  /** Numeric PK from the `user` table — used for admin per-user API calls. */
  userId?: number;
  /** `first_name + last_name`, falling back to company name / email. */
  name: string;
  /** `company_email`. */
  email: string;
  companyName?: string;
  countryCode?: string | null;
  mobileNumber?: string;
  /** Normalized from the backend `role` (e.g. "STARTUP" → "startup"); null if unknown. */
  role: Role | null;
  emailVerified: boolean;
  mobileVerified: boolean;
  /** Derived from the backend `kyc_status` column: Approved → VERIFIED, Rejected →
   *  REJECTED, otherwise PENDING. */
  kycStatus: KycStatus;
}

/** The full `get-user-list` list (no pagination metadata from the backend yet). */
export interface AdminUserListResponse {
  data: AdminUserListItem[];
  total: number;
}

/** Detail shown in the User Management drawer (currently the same list record). */
export type AdminUserDetail = AdminUserListItem;

/** KYC review state used by the tabs/list + per-document status. */
export type KycReviewStatus = "PENDING" | "APPROVED" | "REJECTED";

/** One uploaded side of a document (front/back), viewed via the file-preview flow. */
export interface KycDocumentSide {
  /** Display label, e.g. "Front" / "Back". */
  label: string;
  s3Key: string;
  fileName?: string;
}

/** One KYC document (AADHAAR / PAN) with its file(s) + per-document review state. */
export interface KycDocument {
  kycId: number;
  /** Document type, e.g. AADHAAR / PAN. */
  type: string;
  /** The typed document number (Aadhaar / PAN), from `document_number`. */
  documentNumber?: string;
  status: KycReviewStatus;
  rejectionReason?: string | null;
  uploadedAt?: string;
  verifiedAt?: string | null;
  /** Front (and, for AADHAAR, back) files. */
  sides: KycDocumentSide[];
}

/**
 * One KYC submission row, normalized from `get-user-kyc_docs`. That response
 * already carries the full document set, so the review drawer reuses this record
 * directly (no separate detail fetch).
 */
export interface KycSubmissionListItem {
  /** Stable identifier — backend `uid`. */
  id: string;
  /** Backend `company_id` — the key the overall review-action endpoint expects. */
  companyId?: number;
  applicantName: string;
  email?: string;
  countryCode?: string | null;
  phone?: string;
  organizationName?: string;
  emailVerified: boolean;
  mobileVerified: boolean;
  /** Submission-level status derived from the documents / `is_kyc_verified`. */
  status: KycReviewStatus;
  /** Earliest document upload time (ISO 8601). */
  submittedAt?: string;
  documents: KycDocument[];
}

/** The full `get-user-kyc_docs` list (no pagination metadata from the backend yet). */
export interface KycSubmissionListResponse {
  data: KycSubmissionListItem[];
  total: number;
}

/** Tabs/search filter for the KYC Review list (applied client-side). */
export interface KycSubmissionListParams {
  status?: "all" | "pending" | "approved" | "rejected";
  search?: string;
}

/** Payload for the approve / reject / request-info review action (API is TBD). */
export interface ReviewKycPayload {
  action: "APPROVE" | "REJECT" | "REQUEST_INFO";
  note?: string;
}

/** Response from the KYC review action. */
export interface ReviewKycResponse {
  success?: boolean;
  message?: string;
  data?: unknown;
}
/* ------------------------------------------------------------------ *
 * Explore — Matching Engine results (swipe deck + grid)
 * Mirrors the `/matches` response: a list of compatibility matches for the
 * current profile. Components consume `ExploreMatch` (the `data.matches[]` item).
 * ------------------------------------------------------------------ */
/** The matched company's account type, as returned by the backend (uppercase). */
export type ExploreMatchRole = "INVESTOR" | "B2B" | "STARTUP";

/**
 * One compatibility match — the shape of each `data.matches[]` entry. Keys mirror
 * the backend exactly (snake_case, incl. spelling quirks like `prefrerred_*`,
 * `export_rediness`, `products_ervice_Offered`). Role-specific blocks are optional:
 * only the fields for that match's `role` are present.
 */
export interface ExploreMatch {
  // ---- common ----
  profileId: number;
  /** Recipient identifiers used when sending a connection request. */
  roleId: number;
  companyId: number;
  role: ExploreMatchRole;
  /** Overall compatibility score, 0–100. */
  compatibility: number;
  first_name: string | null;
  last_name: string | null;
  /** Background photo when present; otherwise the card shows an initials avatar. */
  profile_photo: string | null;
  /** Company name (used as the card title). */
  organization_name: string;
  short_bio: string | null;
  country: string | null;
  continent: string | null;
  /** Sector tags shown as chips. */
  primary_sector: string[];
  /** AI-generated explanation of why this profile was matched. */
  rationale?: string | null;
  linkedin_profile_url?: string | null;
  linkedin_url?: string | null;
  company_website_url?: string | null;
  company_email?: string | null;
  country_code?: string | null;
  mobile_number?: string | null;

  // ---- investor-specific (present when role === "INVESTOR") ----
  ticket_size_amt_min?: number;
  ticket_size_amt_max?: number;
  prefrerred_investment_stage?: string[];
  stage_focus?: string | null;
  investor_sector_preference?: string[];
  geographic_investment_preference?: string[];
  investor_type?: string;
  investor_portfolio_overview?: string | null;
  number_of_investments_to_date?: number;
  investor_intent?: string;

  // ---- b2b-specific (present when role === "B2B") ----
  b2b_sector?: string;
  b2b_sub_sector?: string;
  revenue_band?: string;
  min_order_quantity?: number;
  export_rediness?: string;
  industry_vertical?: string;
  years_in_operation?: number;
  operational_capacity_description?: string | null;
  products_ervice_Offered?: string;
  business_requirements?: string;
  b2b_intent?: string;
}

/** Raw envelope returned by the matches endpoint. */
export interface ExploreMatchesResponse {
  success: boolean;
  data: {
    /** The id of the profile these matches were computed for. */
    profileId: number;
    matches: ExploreMatch[];
    /** Daily connection-request cap for the current profile. */
    requestLimit?: number;
    /** Requests still available today. */
    requestsRemaining?: number;
    /** Requests already sent within the current window. */
    requestsSentInWindow?: number;
  };
  message: string;
}

/** A swipe decision on a match card. */
export type ExploreDecision = "reject" | "skip" | "send";

/** Body sent to POST /api/v1/connection (keys per backend). */
export interface SendConnectionRequestPayload {
  recipientUserId: number;
  recipientRoleId?: number;
  recipientCompanyId?: number;
  personalMessage: string;
  bussinessIntent: string[];
  expectedDealSize: string;
  productServiceDetails: string;
}

/** Response from POST /api/v1/connection. */
export interface SendConnectionRequestResponse {
  success: boolean;
  message: string;
  data?: unknown;
}

/** Lifecycle status of a connection request. */
export type ConnectionStatus =
  | "PENDING"
  | "VIEWED"
  | "ACCEPTED"
  | "DECLINED"
  | "DEFERRED"
  | "WITHDRAWN"
  | "EXPIRED";

/** Whether I'm the recipient (received) or the sender (sent) of the request. */
export type ConnectionDirection = "received" | "sent";

/** One connection request as shown in the Connections screen (list + detail). */
export interface ConnectionRequest {
  id: string;
  direction: ConnectionDirection;
  name: string;
  company: string;
  role: Role;
  intent: string;
  message?: string;
  productServiceDetails?: string;
  status: ConnectionStatus;
  createdAt: string;
  updatedAt: string;
}

/** Actions a user can take on a request (UI-level). */
export type ConnectionActionType = "ACCEPT" | "DECLINE" | "DEFER" | "WITHDRAW";

/** Body for the change-status API. `status` is the backend's title-case value
 *  (e.g. "Accepted"), translated from our internal uppercase status. */
export interface ConnectionActionPayload {
  connectionId: number;
  status: string;
  reason?: string;
}

export interface ConnectionActionResponse {
  success: boolean;
  message: string;
  data?: {
    connection?: { id: string | number; status: ConnectionStatus };
    deal_room_id?: string | number | null;
  };
}

/** Response from GET /api/v1/connections?direction=. */
export interface ConnectionsListResponse {
  success: boolean;
  message: string;
  data: ConnectionRequest[];
}

/* ===========================================================================
 * User Limit Config — admin-configurable per-user connection limits.
 * Managed via GET/PUT /api/v1/admin/users/:userId/limit-config.
 * ======================================================================== */

/**
 * Per-user limit configuration returned by the admin limit-config endpoint.
 * `is_custom` is true when an admin has saved custom values; false means the
 * values shown are the system-wide defaults.
 */
export interface UserLimitConfig {
  user_id: number;
  allowed_connections: number;
  allowed_free_trial_days: number;
  allowed_premium_days: number;
  /** False when no custom config has been saved yet (defaults are returned). */
  is_custom: boolean;
}

/**
 * Payload for PUT /api/v1/admin/users/:userId/limit-config.
 * All fields are optional — at least one must be provided (enforced by the backend).
 */
export interface UpdateUserLimitConfigPayload {
  allowed_connections?: number;
  allowed_free_trial_days?: number;
  allowed_premium_days?: number;
}
