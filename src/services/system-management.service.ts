import { api } from "@/lib/axios";
import { API_ENDPOINTS } from "@/config/constant";
import type { SystemSettings } from "@/types/api.types";

/**
 * Super Admin → System Management data (platform-wide OTP / trial / feature-flag config).
 *
 * The backend endpoint does not exist yet. When the real curl arrives, this is the ONLY
 * file that changes — the page and its components never see a backend key:
 *   1. point `API_ENDPOINTS.ADMIN_SYSTEM_SETTINGS` (config/constant.ts) at the real path;
 *   2. rename the raw keys read in `toSystemSettings` (the `raw.*` / `otp.*` strings);
 *   3. rename the keys written in `toSystemSettingsPayload`.
 * Every read is defaulted, so a partial or differently-shaped response degrades to the
 * shipped defaults instead of crashing the screen. The access token is attached by the
 * axios interceptor.
 */

/**
 * The configuration the platform ships with — the fallback for every field the backend
 * omits, the target of "Reset Defaults", and what the screen shows while the endpoint
 * doesn't exist yet.
 */
export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  otp: {
    primaryProvider: "twilio_global_sms",
    failoverProvider: "aws_sns_secondary",
    maxAttempts: 3,
    expirySeconds: 300,
    cooldownMinutes: 15,
    sandboxMode: false,
  },
  trial: {
    defaultDurationDays: 14,
    maxExtensionDays: 30,
    manualExtension: true,
    autoDowngrade: true,
    expiryNotifications: true,
  },
  flags: {
    maintenanceMode: false,
    registrationOpen: true,
    aiMatchingEngine: true,
  },
};

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

function str(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

/** Map the raw settings response onto our typed `SystemSettings`. */
export function toSystemSettings(raw: Record<string, unknown>): SystemSettings {
  const d = DEFAULT_SYSTEM_SETTINGS;
  const otp = (raw.otp ?? {}) as Record<string, unknown>;
  const trial = (raw.trial ?? {}) as Record<string, unknown>;
  const flags = (raw.flags ?? {}) as Record<string, unknown>;
  const stats = (raw.otp_stats ?? {}) as Record<string, unknown>;

  return {
    otp: {
      primaryProvider: str(otp.primary_provider, d.otp.primaryProvider),
      failoverProvider: str(otp.failover_provider, d.otp.failoverProvider),
      maxAttempts: num(otp.max_attempts, d.otp.maxAttempts),
      expirySeconds: num(otp.expiry_seconds, d.otp.expirySeconds),
      cooldownMinutes: num(otp.cooldown_minutes, d.otp.cooldownMinutes),
      sandboxMode: bool(otp.sandbox_mode, d.otp.sandboxMode),
    },
    trial: {
      defaultDurationDays: num(trial.default_duration_days, d.trial.defaultDurationDays),
      maxExtensionDays: num(trial.max_extension_days, d.trial.maxExtensionDays),
      manualExtension: bool(trial.manual_extension, d.trial.manualExtension),
      autoDowngrade: bool(trial.auto_downgrade, d.trial.autoDowngrade),
      expiryNotifications: bool(trial.expiry_notifications, d.trial.expiryNotifications),
    },
    flags: {
      maintenanceMode: bool(flags.maintenance_mode, d.flags.maintenanceMode),
      registrationOpen: bool(flags.registration_open, d.flags.registrationOpen),
      aiMatchingEngine: bool(flags.ai_matching_engine, d.flags.aiMatchingEngine),
    },
    otpStats:
      stats.success_rate != null || stats.latency_seconds != null
        ? { successRate: num(stats.success_rate, 0), latencySeconds: num(stats.latency_seconds, 0) }
        : undefined,
    lastSavedAt: (raw.last_saved_at as string | undefined) ?? undefined,
    lastSavedBy: (raw.last_saved_by as string | undefined) ?? undefined,
  };
}

/** Build the PUT body from the edited settings (inverse of `toSystemSettings`). */
export function toSystemSettingsPayload(settings: SystemSettings): Record<string, unknown> {
  return {
    otp: {
      primary_provider: settings.otp.primaryProvider,
      failover_provider: settings.otp.failoverProvider,
      max_attempts: settings.otp.maxAttempts,
      expiry_seconds: settings.otp.expirySeconds,
      cooldown_minutes: settings.otp.cooldownMinutes,
      sandbox_mode: settings.otp.sandboxMode,
    },
    trial: {
      default_duration_days: settings.trial.defaultDurationDays,
      max_extension_days: settings.trial.maxExtensionDays,
      manual_extension: settings.trial.manualExtension,
      auto_downgrade: settings.trial.autoDowngrade,
      expiry_notifications: settings.trial.expiryNotifications,
    },
    flags: {
      maintenance_mode: settings.flags.maintenanceMode,
      registration_open: settings.flags.registrationOpen,
      ai_matching_engine: settings.flags.aiMatchingEngine,
    },
  };
}

/** Fetch the current platform settings. */
export async function fetchSystemSettings(): Promise<SystemSettings> {
  const { data } = await api.get(API_ENDPOINTS.ADMIN_SYSTEM_SETTINGS);
  const raw = (data?.data ?? data ?? {}) as Record<string, unknown>;
  return toSystemSettings(raw);
}

/**
 * Save the whole settings object. Returns the server's view of the saved settings so the
 * page can pick up `last_saved_at` / `last_saved_by`; falls back to the sent values when
 * the response carries no body.
 */
export async function updateSystemSettings(settings: SystemSettings): Promise<SystemSettings> {
  const { data } = await api.put(API_ENDPOINTS.ADMIN_SYSTEM_SETTINGS, toSystemSettingsPayload(settings));
  const raw = (data?.data ?? data) as Record<string, unknown> | undefined;
  return raw && typeof raw === "object" && "otp" in raw ? toSystemSettings(raw) : settings;
}
