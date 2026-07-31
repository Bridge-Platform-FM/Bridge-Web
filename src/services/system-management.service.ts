import { api } from "@/lib/axios";
import { API_ENDPOINTS } from "@/config/constant";
import type { OtpConfigEntry, PlatformFlags, TrialSettings } from "@/types/api.types";

/**
 * Super Admin → System Management data.
 *
 * The screen is three independent cards, and this file mirrors that: one fetch/update pair
 * per section, each against its own endpoint. A section's failure never affects the others.
 *
 *   OTP Configuration  — LIVE   (`SUPER_ADMIN_OTP_CONFIG`)
 *   Trial Management   — placeholder endpoint
 *   Platform Controls  — placeholder endpoint
 *
 * For the two placeholders, when the real curl arrives this is the ONLY file that changes —
 * the page and its components never see a backend key:
 *   1. point the constant (config/constant.ts) at the real path;
 *   2. rename the raw keys read in the `to*` mapper and written in the `to*Payload` mapper.
 * Every read is defaulted, so a partial or differently-shaped response degrades to the
 * shipped defaults instead of crashing the screen. The access token is attached by the
 * axios interceptor.
 */

/* ----- Shared coercion helpers ----- */

/** Coerce anything number-ish to a number, falling back to the shipped default. */
function num(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Coerce anything boolean-ish ("true"/1/true) to a boolean, defaulted. */
function bool(value: unknown, fallback: boolean): boolean {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "string") return value.toLowerCase() === "true" || value === "1";
  return Boolean(value);
}

/* ----- OTP Configuration (LIVE: /super-admin/config/otp-config) ----- */

/**
 * The endpoint returns the `otp_config_master` rows as-is, so the mapper only camel-cases
 * the column names — `lookup` stays untouched and is what the UI renders as each field's
 * label, and is the key the PUT body is built from.
 */
function toOtpConfigEntry(raw: Record<string, unknown>): OtpConfigEntry {
  return {
    id: Number(raw.id),
    lookup: String(raw.lookup ?? ""),
    value: raw.value == null ? "" : String(raw.value),
    defaultValue: raw.default_value == null ? "" : String(raw.default_value),
    dataType: String(raw.data_type ?? "integer"),
    unit: String(raw.unit ?? ""),
    description: (raw.description as string | null) ?? undefined,
    updatedAt: (raw.updated_at as string | null) ?? undefined,
  };
}

/**
 * Fetch every OTP config row. The response is `{ success, message, data: [...] }`; a
 * non-array `data` degrades to an empty list so the card renders its empty state rather
 * than crashing the screen.
 */
export async function fetchOtpConfig(): Promise<OtpConfigEntry[]> {
  const { data } = await api.get(API_ENDPOINTS.SUPER_ADMIN_OTP_CONFIG);
  const rows = data?.data ?? data;
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => toOtpConfigEntry(row as Record<string, unknown>)).filter((e) => e.lookup);
}

/**
 * Save changed OTP config rows. The body is keyed by `lookup` — `{ otpConfig: { SENT_OTP_TTL:
 * "180", … } }` — which the backend feeds through `jsonb_each_text`, so only the keys sent
 * are touched. Values go as strings (the column is a varchar). The response carries no body.
 */
export async function updateOtpConfig(updates: Record<string, string>): Promise<void> {
  await api.put(API_ENDPOINTS.SUPER_ADMIN_OTP_CONFIG, { otpConfig: updates });
}

/* ----- Trial Management (placeholder endpoint) ----- */

/** Shipped trial values — the fallback for omitted fields and the "Reset Defaults" target. */
export const DEFAULT_TRIAL_SETTINGS: TrialSettings = {
  defaultDurationDays: 14,
  maxExtensionDays: 30,
  manualExtension: true,
  autoDowngrade: true,
  expiryNotifications: true,
};

export function toTrialSettings(raw: Record<string, unknown>): TrialSettings {
  const d = DEFAULT_TRIAL_SETTINGS;
  return {
    defaultDurationDays: num(raw.default_duration_days, d.defaultDurationDays),
    maxExtensionDays: num(raw.max_extension_days, d.maxExtensionDays),
    manualExtension: bool(raw.manual_extension, d.manualExtension),
    autoDowngrade: bool(raw.auto_downgrade, d.autoDowngrade),
    expiryNotifications: bool(raw.expiry_notifications, d.expiryNotifications),
  };
}

function toTrialSettingsPayload(trial: TrialSettings): Record<string, unknown> {
  return {
    default_duration_days: trial.defaultDurationDays,
    max_extension_days: trial.maxExtensionDays,
    manual_extension: trial.manualExtension,
    auto_downgrade: trial.autoDowngrade,
    expiry_notifications: trial.expiryNotifications,
  };
}

export async function fetchTrialSettings(): Promise<TrialSettings> {
  const { data } = await api.get(API_ENDPOINTS.SUPER_ADMIN_TRIAL_CONFIG);
  return toTrialSettings((data?.data ?? data ?? {}) as Record<string, unknown>);
}

export async function updateTrialSettings(trial: TrialSettings): Promise<void> {
  await api.put(API_ENDPOINTS.SUPER_ADMIN_TRIAL_CONFIG, toTrialSettingsPayload(trial));
}

/* ----- Platform Controls (placeholder endpoint) ----- */

/** Shipped feature-flag state — the fallback and the "Reset Defaults" target. */
export const DEFAULT_PLATFORM_FLAGS: PlatformFlags = {
  maintenanceMode: false,
  registrationOpen: true,
  aiMatchingEngine: true,
  geoLocationMatching: true,
};

export function toPlatformFlags(raw: Record<string, unknown>): PlatformFlags {
  const d = DEFAULT_PLATFORM_FLAGS;
  return {
    maintenanceMode: bool(raw.maintenance_mode, d.maintenanceMode),
    registrationOpen: bool(raw.registration_open, d.registrationOpen),
    aiMatchingEngine: bool(raw.ai_matching_engine, d.aiMatchingEngine),
    geoLocationMatching: bool(raw.geo_location_matching, d.geoLocationMatching),
  };
}

function toPlatformFlagsPayload(flags: PlatformFlags): Record<string, unknown> {
  return {
    maintenance_mode: flags.maintenanceMode,
    registration_open: flags.registrationOpen,
    ai_matching_engine: flags.aiMatchingEngine,
    geo_location_matching: flags.geoLocationMatching,
  };
}

export async function fetchPlatformFlags(): Promise<PlatformFlags> {
  const { data } = await api.get(API_ENDPOINTS.SUPER_ADMIN_PLATFORM_FLAGS);
  return toPlatformFlags((data?.data ?? data ?? {}) as Record<string, unknown>);
}

export async function updatePlatformFlags(flags: PlatformFlags): Promise<void> {
  await api.put(API_ENDPOINTS.SUPER_ADMIN_PLATFORM_FLAGS, toPlatformFlagsPayload(flags));
}
