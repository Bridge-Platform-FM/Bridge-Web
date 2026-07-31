"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { AsyncState } from "@/components/ui/AsyncState";
import {
  FeatureFlagCard,
  SettingToggleRow,
  SettingsSection,
} from "@/components/dashboard/system-management/SettingsCards";
import { useAuth } from "@/components/auth/AuthProvider";
import { isSuperAdmin } from "@/lib/roles";
import {
  DEFAULT_PLATFORM_FLAGS,
  DEFAULT_TRIAL_SETTINGS,
  fetchOtpConfig,
  fetchPlatformFlags,
  fetchTrialSettings,
  updateOtpConfig,
  updatePlatformFlags,
  updateTrialSettings,
} from "@/services/system-management.service";
import type { OtpConfigEntry, PlatformFlags, TrialSettings } from "@/types/api.types";

/**
 * Three independent cards, each with its own GET/PUT pair, its own Edit toggle and its own
 * Reset/Save bar — nothing on this screen saves as a whole. To add, remove or reword a
 * setting, edit the lists below (same idea as `suggestion-weights/page.tsx`'s PARAMETERS).
 *
 * The OTP Configuration card declares nothing here: its fields come from
 * GET /super-admin/config/otp-config (`otp_config_master`), one field per row, labelled
 * with the row's own `lookup` key. Adding a key to that table adds a field to this screen.
 */

/** The three switches in the Trial Management card. */
const TRIAL_TOGGLES: { key: keyof TrialSettings; label: string; description: string }[] = [
  { key: "manualExtension", label: "Manual Extension", description: "Allows support to extend active trials" },
  { key: "autoDowngrade", label: "Auto Downgrade", description: "Move to free tier on expiry" },
  { key: "expiryNotifications", label: "Expiry Notifications", description: "Email alerts 48h before end" },
];

/** The feature-flag tiles in the Platform Controls grid. */
const PLATFORM_FLAGS: { key: keyof PlatformFlags; label: string; description: string; icon: string }[] = [
  { key: "maintenanceMode",  label: "Maintenance Mode",  description: "Lock all public access and show status page.", icon: "engineering" },
  { key: "registrationOpen", label: "Registration Open", description: "Allow new users to create accounts.",          icon: "how_to_reg"  },
  { key: "aiMatchingEngine", label: "AI Matching Engine", description: "Rule-based connection matching.",      icon: "memory"      },
  { key: "geoLocationMatching", label: "Geo Location Matching", description: "Factor proximity into match scoring.",  icon: "location_on" },
];

/** Number inputs: empty string → 0 rather than NaN. */
const toNumber = (raw: string) => (raw === "" ? 0 : Number(raw));

/**
 * Field label for one OTP config row: the backend `lookup` with its underscores opened out
 * ("SENT_OTP_TTL" → "SENT OTP TTL"). The key is otherwise untouched so the screen reads as
 * the API's own vocabulary.
 */
const otpLabel = (entry: OtpConfigEntry) => entry.lookup.replace(/_/g, " ");

/* ----- Per-section edit state ----- */

interface SectionEditor<T> {
  /** Working copy — what the controls render and mutate. */
  value: T;
  setValue: React.Dispatch<React.SetStateAction<T>>;
  /** Last fetched/saved snapshot — the dirty baseline and the discard target. */
  saved: T;
  /** Set both copies at once (initial load, and after a successful save). */
  hydrate: (next: T) => void;
  editing: boolean;
  toggleEdit: (next: boolean) => void;
  dirty: boolean;
  saving: boolean;
  setSaving: (v: boolean) => void;
}

/**
 * Edit/dirty/save bookkeeping for one card. Each card holds its own instance, so toggling
 * or saving one never touches another.
 */
function useSectionEditor<T>(initialValue: T): SectionEditor<T> {
  const [value, setValue] = useState<T>(initialValue);
  const [saved, setSaved] = useState<T>(initialValue);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const dirty = JSON.stringify(value) !== JSON.stringify(saved);

  const hydrate = useCallback((next: T) => {
    setValue(next);
    setSaved(next);
  }, []);

  /** Leaving edit mode discards anything unsaved, so nothing pending hides behind a
   *  read-only card. */
  const toggleEdit = (next: boolean) => {
    setEditing(next);
    if (!next && dirty) {
      setValue(saved);
      toast.info("Unsaved changes were discarded.");
    }
  };

  return { value, setValue, saved, hydrate, editing, toggleEdit, dirty, saving, setSaving };
}

export default function SystemManagementPage() {
  const router = useRouter();
  const { role, isLoaded } = useAuth();

  const otp = useSectionEditor<OtpConfigEntry[]>([]);
  const trial = useSectionEditor<TrialSettings>(DEFAULT_TRIAL_SETTINGS);
  const flags = useSectionEditor<PlatformFlags>(DEFAULT_PLATFORM_FLAGS);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && !isSuperAdmin(role)) router.replace("/dashboard");
  }, [isLoaded, role, router]);

  const { hydrate: hydrateOtp } = otp;
  const { hydrate: hydrateTrial } = trial;
  const { hydrate: hydrateFlags } = flags;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Each card has its own endpoint, so they're fetched independently — the two
    // placeholder endpoints 404ing can't blank out the live OTP config.
    const [otpResult, trialResult, flagsResult] = await Promise.allSettled([
      fetchOtpConfig(),
      fetchTrialSettings(),
      fetchPlatformFlags(),
    ]);

    if (otpResult.status === "fulfilled") {
      hydrateOtp(otpResult.value);
    } else {
      setError(
        otpResult.reason instanceof Error
          ? otpResult.reason.message
          : "Couldn't load the OTP configuration."
      );
    }

    // Trial + flags don't have endpoints yet, so a failure falls back to the shipped
    // defaults. DELETE these fallbacks once those endpoints are live — surfacing the
    // error the way the OTP card does is the correct behaviour then.
    hydrateTrial(trialResult.status === "fulfilled" ? trialResult.value : DEFAULT_TRIAL_SETTINGS);
    hydrateFlags(flagsResult.status === "fulfilled" ? flagsResult.value : DEFAULT_PLATFORM_FLAGS);

    setLoading(false);
  }, [hydrateOtp, hydrateTrial, hydrateFlags]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load() sets loading; runs once on mount
    void load();
  }, [load]);

  /** Save one card: PUT, adopt the values as the new baseline, report either way. */
  async function saveSection<T>(section: SectionEditor<T>, put: () => Promise<void>, label: string) {
    section.setSaving(true);
    try {
      await put();
      section.hydrate(section.value);
      toast.success(`${label} saved.`);
    } catch {
      toast.error(`Couldn't save the ${label.toLowerCase()}. Please try again.`);
    } finally {
      section.setSaving(false);
    }
  }

  /* ----- OTP Configuration ----- */

  /** Update one OTP config row by its backend `lookup` key. */
  const setOtpValue = (lookup: string, value: string) => {
    otp.setValue((prev) => prev.map((row) => (row.lookup === lookup ? { ...row, value } : row)));
  };

  /** Only the rows whose value the user actually touched — the PUT is a partial update. */
  const otpChanges = otp.value.reduce<Record<string, string>>((acc, row) => {
    const before = otp.saved.find((r) => r.lookup === row.lookup);
    if (before && before.value !== row.value) acc[row.lookup] = row.value;
    return acc;
  }, {});

  const handleOtpSave = () => {
    // A blank value would be written to the column verbatim, so stop before the PUT.
    const blank = otp.value.find((row) => !row.value.trim());
    if (blank) {
      toast.error(`${otpLabel(blank)} can't be empty.`);
      return;
    }
    void saveSection(otp, () => updateOtpConfig(otpChanges), "OTP configuration");
  };

  /** Each OTP row carries its own shipped value in `default_value`. */
  const handleOtpReset = () => {
    otp.setValue((prev) => prev.map((row) => ({ ...row, value: row.defaultValue })));
    toast.info("Reverted to the default configuration. Save to apply.");
  };

  /* ----- Trial Management ----- */

  const setTrial = <K extends keyof TrialSettings>(key: K, value: TrialSettings[K]) => {
    trial.setValue((prev) => ({ ...prev, [key]: value }));
  };

  /* ----- Platform Controls ----- */

  const setFlag = <K extends keyof PlatformFlags>(key: K, value: PlatformFlags[K]) => {
    flags.setValue((prev) => ({ ...prev, [key]: value }));
  };

  if (!isLoaded || !isSuperAdmin(role)) return null;

  return (
    <div className="mx-auto max-w-[1280px] px-6 pt-8 md:px-8">
      <div className="mb-8">
        <h1 className="mb-2 font-headline text-3xl font-bold tracking-[-0.02em] text-on-surface md:text-4xl">
          System Management
        </h1>
        <p className="max-w-2xl text-on-surface-variant">
          Manage platform-wide configuration, security protocols, and trial behaviors across the
          BridgeConnect ecosystem.
        </p>
      </div>

      <AsyncState loading={loading} error={error} onRetry={load}>
        <div className="space-y-8">
          {/* OTP Configuration — one field per `otp_config_master` row, labelled with the
              row's own backend `lookup` key so the screen and the API never drift. */}
          <SettingsSection
            icon="key"
            title="OTP Configuration"
            description="Multi-factor authentication gateway settings"
            editing={otp.editing}
            onEditChange={otp.toggleEdit}
            dirty={otp.dirty}
            saving={otp.saving}
            onSave={handleOtpSave}
            onReset={handleOtpReset}
          >
            {otp.value.length === 0 ? (
              <p className="text-sm text-on-surface-variant">
                No OTP configuration keys were returned.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-x-12 gap-y-8 md:grid-cols-3">
                {otp.value.map((entry) => (
                  <Input
                    key={entry.lookup}
                    id={`otp-${entry.lookup}`}
                    variant="underline"
                    label={otpLabel(entry)}
                    value={entry.value}
                    onChange={(e) => setOtpValue(entry.lookup, e.target.value)}
                    {...(entry.dataType === "integer"
                      ? { type: "number" as const, min: 0 }
                      : { type: "text" as const })}
                    disabled={!otp.editing}
                  />
                ))}
              </div>
            )}
          </SettingsSection>

          {/* Trial Management */}
          <SettingsSection
            icon="timer"
            title="Trial Management"
            description="Control user onboarding and conversion windows"
            editing={trial.editing}
            onEditChange={trial.toggleEdit}
            dirty={trial.dirty}
            saving={trial.saving}
            onSave={() => void saveSection(trial, () => updateTrialSettings(trial.value), "Trial settings")}
          >
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12">
              <div className="space-y-6 rounded-lg bg-surface-container-low p-6">
                <Input
                  id="trial-duration"
                  variant="underline"
                  type="number"
                  min={0}
                  label="Default Duration (Days)"
                  value={trial.value.defaultDurationDays}
                  onChange={(e) => setTrial("defaultDurationDays", toNumber(e.target.value))}
                  disabled={!trial.editing}
                />
                <Input
                  id="trial-max-extension"
                  variant="underline"
                  type="number"
                  min={0}
                  label="No of connection"
                  value={trial.value.maxExtensionDays}
                  onChange={(e) => setTrial("maxExtensionDays", toNumber(e.target.value))}
                  disabled={!trial.editing}
                />
              </div>

              <div className="space-y-6">
                {TRIAL_TOGGLES.map((toggle, i) => (
                  <SettingToggleRow
                    key={toggle.key}
                    label={toggle.label}
                    description={toggle.description}
                    divider={i < TRIAL_TOGGLES.length - 1}
                    checked={trial.value[toggle.key] as boolean}
                    onChange={(v) => setTrial(toggle.key, v)}
                    disabled={!trial.editing}
                  />
                ))}
              </div>
            </div>
          </SettingsSection>

          {/* Platform Controls */}
          <SettingsSection
            icon="settings_suggest"
            title="Platform Controls"
            description="Global feature flags and operational state"
            editing={flags.editing}
            onEditChange={flags.toggleEdit}
            dirty={flags.dirty}
            saving={flags.saving}
            onSave={() => void saveSection(flags, () => updatePlatformFlags(flags.value), "Platform controls")}
          >
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {PLATFORM_FLAGS.map((flag) => (
                <FeatureFlagCard
                  key={flag.key}
                  icon={flag.icon}
                  label={flag.label}
                  description={flag.description}
                  checked={flags.value[flag.key]}
                  onChange={(v) => setFlag(flag.key, v)}
                  disabled={!flags.editing}
                />
              ))}
            </div>
          </SettingsSection>
        </div>
      </AsyncState>
    </div>
  );
}
