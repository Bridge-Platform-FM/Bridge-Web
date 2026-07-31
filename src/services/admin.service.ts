import { api } from "@/lib/axios";
import { API_ENDPOINTS } from "@/config/constant";
import { normalizeRole } from "@/lib/roles";
import type {
  AdminAccount,
  AdminAccountStatus,
  AdminUserListItem,
  AdminUserListResponse,
  CreateAdminPayload,
  KycDocument,
  KycDocumentSide,
  KycReviewStatus,
  KycStatus,
  KycSubmissionListItem,
  KycSubmissionListResponse,
  ReviewKycPayload,
  ReviewKycResponse,
  UserLimitConfig,
  UpdateUserLimitConfigPayload,
  MatchingEngineStats,
} from "@/types/api.types";

/**
 * Admin / super-admin back-office data (User Management + KYC Review). Each function
 * unwraps the raw axios envelope and normalizes it into the typed shapes the UI uses,
 * so the rest of the app never depends on the exact backend keys.
 *
 * Endpoint paths/shapes are placeholders (see `ADMIN_*` in `config/constant.ts`) —
 * swap in the real curl path + adjust the `to*` mappers once the API is final. The
 * access token is attached automatically by the axios interceptor.
 */



/**
 * Map the backend `kyc_status` column (title-case, e.g. "Approved"/"Rejected"/
 * "Pending"/null) to the user-list enum. Driven entirely by `kyc_status`:
 * approved/verified → VERIFIED, rejected → REJECTED, everything else → PENDING.
 */
function toUserKycStatus(status: unknown): KycStatus {
  const s = String(status ?? "").toUpperCase();
  if (s === "APPROVED" || s === "VERIFIED") return "VERIFIED";
  if (s === "REJECTED") return "REJECTED";
  return "PENDING";
}

/** Map one raw `get-user-list` row to our AdminUserListItem. */
function toUserListItem(raw: Record<string, unknown>): AdminUserListItem {
  const first = (raw.first_name as string | null) ?? "";
  const last = (raw.last_name as string | null) ?? "";
  const email = String(raw.company_email ?? "");
  const name = [first, last].filter(Boolean).join(" ").trim() || (raw.company_name as string) || email || "—";
  return {
    id: email || String(raw.id ?? ""),
    // user_id is now a UUID string — coerce to string (was Number() before)
    userId: raw.user_id != null ? String(raw.user_id) : undefined,
    name,
    email,
    companyName: (raw.company_name as string | undefined) ?? undefined,
    countryCode: (raw.country_code as string | null) ?? null,
    mobileNumber: (raw.mobile_number as string | undefined) ?? undefined,
    role: normalizeRole(raw.role),
    emailVerified: Boolean(raw.is_email_verified),
    mobileVerified: Boolean(raw.is_mobile_number_verified),
    kycStatus: toUserKycStatus(raw.kyc_status),
  };
}

/**
 * Fetch the full user list (`get-user-list`). The backend returns
 * `{ success, data: [...], message }` with no pagination metadata, so filtering +
 * paging happen client-side in the page for now.
 */
export async function fetchUsers(): Promise<AdminUserListResponse> {
  const { data } = await api.get(API_ENDPOINTS.ADMIN_USERS);
  const rows = ((data?.data ?? data) as Record<string, unknown>[]) ?? [];
  const list = Array.isArray(rows) ? rows : [];
  return { data: list.map(toUserListItem), total: list.length };
}

/* ----- KYC Review ----- */

/** Map a backend doc status string (e.g. "Pending") to our review enum. */
function toReviewStatus(v: unknown): KycReviewStatus {
  const s = String(v ?? "").toUpperCase();
  if (s === "APPROVED" || s === "VERIFIED") return "APPROVED";
  if (s === "REJECTED") return "REJECTED";
  return "PENDING";
}

/** Map one raw `kyc_documents` entry (AADHAAR/PAN) to our KycDocument. */
function toKycDocument(raw: Record<string, unknown>): KycDocument {
  const sides: KycDocumentSide[] = [];
  if (raw.front_s3_key) {
    sides.push({ label: "Front", s3Key: String(raw.front_s3_key), fileName: raw.front_file_name as string | undefined });
  }
  if (raw.back_s3_key) {
    sides.push({ label: "Back", s3Key: String(raw.back_s3_key), fileName: raw.back_file_name as string | undefined });
  }
  return {
    kycId: Number(raw.kyc_id ?? 0),
    type: String(raw.document_type ?? "Document"),
    documentNumber: (raw.document_number as string | undefined) ?? undefined,
    status: toReviewStatus(raw.kyc_status),
    rejectionReason: (raw.rejection_reason as string | null) ?? null,
    uploadedAt: raw.kyc_uploaded_at as string | undefined,
    verifiedAt: (raw.verified_at as string | null) ?? null,
    sides,
  };
}

/** Map one raw `get-user-kyc_docs` user row to a KycSubmissionListItem. */
function toKycSubmission(raw: Record<string, unknown>): KycSubmissionListItem {
  const first = (raw.first_name as string | null) ?? "";
  const last = (raw.last_name as string | null) ?? "";
  const email = String(raw.company_email ?? "");
  const name = [first, last].filter(Boolean).join(" ").trim() || (raw.company_name as string) || email || "—";

  const docsRaw = (raw.kyc_documents as Record<string, unknown>[] | null) ?? [];
  const documents = Array.isArray(docsRaw) ? docsRaw.map(toKycDocument) : [];

  // Submission-level status comes from the COMPANY-level `kyc_status` (the row's own
  // field, e.g. "Pending"/"Approved"/"Rejected"), NOT the per-document `kyc_status`
  // inside each `kyc_documents` entry. `is_kyc_verified` is the authoritative
  // "approved" flag; otherwise we normalize the row's kyc_status (title-case from the
  // backend) via toReviewStatus. A rejected document never flips this — only the main
  // review action does.
  const status: KycReviewStatus = raw.is_kyc_verified ? "APPROVED" : toReviewStatus(raw.kyc_status);
  // Earliest upload time across the documents drives the "Submitted" label.
  const submittedAt = documents
    .map((d) => d.uploadedAt)
    .filter((t): t is string => Boolean(t))
    .sort()[0];

  return {
    id: String(raw.uid ?? email),
    // company_id is now a UUID string — coerce to string (was Number() before)
    companyId: raw.company_id != null ? String(raw.company_id) : undefined,
    applicantName: name,
    email,
    countryCode: (raw.country_code as string | null) ?? null,
    phone: (raw.mobile_number as string | undefined) ?? undefined,
    organizationName: (raw.company_name as string | undefined) ?? undefined,
    emailVerified: Boolean(raw.is_email_verified),
    mobileVerified: Boolean(raw.is_mobile_number_verified),
    status,
    submittedAt,
    documents,
  };
}

/**
 * Fetch every KYC submission (`get-user-kyc_docs`). The backend returns the full
 * list (no pagination); only users who actually uploaded documents belong in the
 * review queue, so users with no `kyc_documents` are filtered out. Filtering by
 * tab/search happens client-side in the page.
 */
export async function fetchKycSubmissions(): Promise<KycSubmissionListResponse> {
  const { data } = await api.get(API_ENDPOINTS.ADMIN_KYC);
  const rows = ((data?.data ?? data) as Record<string, unknown>[]) ?? [];
  const list = Array.isArray(rows) ? rows : [];
  const submissions = list.map(toKycSubmission).filter((s) => s.documents.length > 0);
  return { data: submissions, total: submissions.length };
}

/**
 * Approve / reject a whole KYC submission via `review-action` (PUT). The backend
 * keys on `company_id`; a reject must carry a `rejection_reason` (the admin note).
 * `companyId` is now a UUID string.
 */
export async function reviewKyc(companyId: string, payload: ReviewKycPayload): Promise<ReviewKycResponse> {
  const body: Record<string, unknown> = {
    company_id: companyId,
    action: payload.action.toLowerCase(),
  };
  if (payload.action === "REJECT") body.rejection_reason = payload.note;
  const { data } = await api.put<ReviewKycResponse>(API_ENDPOINTS.ADMIN_KYC_REVIEW_ACTION, body);
  return data;
}

/**
 * Approve / reject a single document via `document-action` (PUT). The backend keys
 * on `kyc_id` and a lowercase action; no reason is sent at the document level.
 */
export async function reviewKycDocument(kycId: number, action: "APPROVE" | "REJECT"): Promise<ReviewKycResponse> {
  const { data } = await api.put<ReviewKycResponse>(API_ENDPOINTS.ADMIN_KYC_DOC_ACTION, {
    kyc_id: kycId,
    action: action.toLowerCase(),
  });
  return data;
}

/* ----- User Limit Config ----- */

/**
 * Fetch the connection limit config for a user. Returns system defaults when no
 * custom config has been saved yet (`is_custom` will be false in that case).
 * `userId` is now a UUID string.
 */
export async function fetchUserLimitConfig(userId: string): Promise<UserLimitConfig> {
  const { data } = await api.get(API_ENDPOINTS.ADMIN_USER_LIMIT_CONFIG(userId));
  return data.data as UserLimitConfig;
}

/**
 * Create or update the connection limit config for a user (upsert). All fields are
 * optional — at least one must be provided (enforced server-side by Joi).
 * `userId` is now a UUID string.
 */
export async function updateUserLimitConfig(
  userId: string,
  payload: UpdateUserLimitConfigPayload
): Promise<UserLimitConfig> {
  const { data } = await api.put(API_ENDPOINTS.ADMIN_USER_LIMIT_CONFIG(userId), payload);
  return data.data as UserLimitConfig;
}

/* ----- Admin Accounts (Super Admin → Admin Management) ----- */

/**
 * The staff-account endpoints don't exist on the backend yet. When the real curl
 * arrives, change `ADMIN_ACCOUNTS` / `ADMIN_ACCOUNT_*` in `config/constant.ts` and the
 * raw key strings in `toAdminAccount` + `createAdmin` below — nothing else.
 */

/** Map one raw admin row to our AdminAccount. Every field is defaulted. */
function toAdminAccount(raw: Record<string, unknown>): AdminAccount {
  const first = (raw.first_name as string | null) ?? "";
  const last = (raw.last_name as string | null) ?? "";
  const email = String(raw.email ?? raw.admin_email ?? "");
  const name = String(raw.name ?? [first, last].filter(Boolean).join(" ").trim()) || email || "—";
  const role = normalizeRole(raw.role) === "super_admin" ? "super_admin" : "admin";
  const permsRaw = raw.permissions;

  return {
    id: String(raw.admin_id ?? raw.id ?? email),
    name,
    email,
    mobileNumber: (raw.mobile_number as string | undefined) ?? undefined,
    countryCode: (raw.country_code as string | null) ?? null,
    role,
    roleProfile: (raw.role_profile as string | undefined) ?? undefined,
    permissions: Array.isArray(permsRaw) ? permsRaw.map(String) : [],
    status: String(raw.status ?? "").toUpperCase() === "SUSPENDED" ? "SUSPENDED" : "ACTIVE",
    createdAt: (raw.created_at as string | undefined) ?? undefined,
    lastLoginAt: (raw.last_login_at as string | undefined) ?? undefined,
  };
}

/** Fetch every staff account. Filtering + paging happen client-side in the page. */
export async function fetchAdmins(): Promise<AdminAccount[]> {
  const { data } = await api.get(API_ENDPOINTS.ADMIN_ACCOUNTS);
  const rows = ((data?.data ?? data) as Record<string, unknown>[]) ?? [];
  return Array.isArray(rows) ? rows.map(toAdminAccount) : [];
}

/** Create a staff account from the "Create New Admin" form. */
export async function createAdmin(payload: CreateAdminPayload): Promise<AdminAccount> {
  const { data } = await api.post(API_ENDPOINTS.ADMIN_ACCOUNTS, {
    name: payload.name,
    email: payload.email,
    mobile_number: payload.mobileNumber,
    password: payload.password,
    permissions: payload.permissions,
    send_welcome_email: payload.sendWelcomeEmail,
  });
  return toAdminAccount((data?.data ?? data ?? {}) as Record<string, unknown>);
}

/** Replace an admin's role profile + module permissions. */
export async function updateAdminPermissions(
  id: string,
  roleProfile: string,
  permissions: string[]
): Promise<void> {
  await api.put(API_ENDPOINTS.ADMIN_ACCOUNT_PERMISSIONS(id), {
    role_profile: roleProfile,
    permissions,
  });
}

/**
 * Suspend or reactivate an admin. `reason` is collected by the suspend confirmation modal
 * and is only sent when present, so the reactivate path keeps its original body.
 */
export async function setAdminStatus(
  id: string,
  status: AdminAccountStatus,
  reason?: string
): Promise<void> {
  await api.put(API_ENDPOINTS.ADMIN_ACCOUNT_STATUS(id), {
    status: status.toLowerCase(),
    ...(reason ? { reason } : {}),
  });
}

export async function fetchMatchingEngineStats(): Promise<MatchingEngineStats> {
  const { data } = await api.get<{ success: boolean; data: MatchingEngineStats; message: string }>(
    API_ENDPOINTS.ADMIN_MATCHING_ENGINE_STATS,
  );
  return data.data;
}