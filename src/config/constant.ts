/** Shared API version prefix — change here to bump the whole API version. */
const BASE = "/api/v1";

/** Path prefix per API group — change/add groups here. */
const AUTH = `${BASE}/auth`;
const ADMIN_AUTH = `${BASE}/admin/auth`;
const SUPERADMIN_AUTH = `${BASE}/superadmin/auth`;
const FILE = `${BASE}/file`;
const USERS = `${BASE}/users`;
const SESSIONS = `${BASE}/sessions`;
// const KYC = `${BASE}/kyc`;
// Admin/super-admin back-office (User Management + KYC Review).
const ADMIN = `${BASE}/admin`;
// Matching Engine (Explore — compatibility matches).
const MATCHING = `${BASE}/matching`;
// Connection requests (proposals sent to matched profiles).
const CONNECTIONS = `${BASE}/connections`;
// Deal Rooms (chat workspaces spawned from an accepted connection).
const DEAL_ROOMS = `${BASE}/deal-rooms`;
// Meetings scheduled inside a deal room.
const MEETINGS = `${BASE}/meetings`;

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

  // ----- Session Management -----
  // Check whether the user is at their active-session limit (called after MFA
  // verify, before the dashboard redirect). The access token is sent via the
  // shared axios interceptor — no extra headers needed at the call site.
  SESSION_LIMIT_STATUS: `${SESSIONS}/limit-status`,
  // Revoke one or more sessions by id (called from the session-chooser modal).
  REVOKE_SELECTED_SESSIONS: `${SESSIONS}/revoke-selected`,

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

  // ----- Connections -----
  // Send a connection request (proposal) to a matched profile. POST.
  CONNECTION_CREATE: `${CONNECTIONS}/`,
  // List my connection requests for a direction ("received" | "sent"). GET.
  //   /api/v1/connections/sent   ·   /api/v1/connections/received
  CONNECTIONS_LIST: (direction: string) => `${CONNECTIONS}/${direction}`,
  // Change a request's status (accept / decline / defer / withdraw).
  // body: { connectionId, status }. POST.
  CONNECTION_ACTION: `${CONNECTIONS}/change-status`,

  // ----- Deal Rooms ----- (Bridge-Server: /api/v1/deal-rooms + /:id/messages, JWT)
  // List the current user's deal rooms. GET. Returns flat requester_*/recipient_* rows.
  DEAL_ROOMS_LIST: DEAL_ROOMS,
  // A room's message history (cursor-paginated, newest-first). GET.
  DEAL_ROOM_MESSAGES: (id: string) => `${DEAL_ROOMS}/${id}/messages`,
  // Close a deal room (both sides go read-only). PUT, body: { reason? }.
  DEAL_ROOM_CLOSE: (id: string) => `${DEAL_ROOMS}/${id}/close`,
  // Send a FILE/media message. POST multipart: field `media` (+ optional `caption`,
  // `download_allowed` = "true"|"false"). NOTE: TEXT messages go over the socket.
  DEAL_ROOM_SEND_MEDIA: (id: string) => `${DEAL_ROOMS}/${id}/messages/media`,
  // List every file shared in a room (shared-files drawer). GET.
  DEAL_ROOM_FILES: (id: string) => `${DEAL_ROOMS}/${id}/messages/media`,
  // Deferred: authenticated media download GET `.../messages/{messageId}/media`,
  //           read receipts PUT `${DEAL_ROOMS}/${id}/messages/read`.
  
  
  // ----- Meetings -----
  // Schedule a meeting inside a deal room. POST.
  MEETING_CREATE: MEETINGS,
  // Upcoming meetings for a deal room (drives the panel's inline preview). GET.
  MEETINGS_UPCOMING: (dealRoomId: string) => `${MEETINGS}/upcoming?dealRoomId=${dealRoomId}`,
  // Every meeting for a deal room (drives the "View All" drawer). GET.
  MEETINGS_LIST: (dealRoomId: string) => `${MEETINGS}?dealRoomId=${dealRoomId}`,
  // A single meeting's full detail (drives the details modal). GET.
  MEETING_DETAIL: (meetingId: string) => `${MEETINGS}/detail?meetingId=${meetingId}`,
  // Update a meeting (partial body — any subset of title/agenda/meetingLink/scheduledAt). PUT.
  MEETING_UPDATE: (meetingId: string) => `${MEETINGS}/update?meetingId=${meetingId}`,
} as const;