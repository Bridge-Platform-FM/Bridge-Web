"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/Select";
import { AsyncState } from "@/components/ui/AsyncState";
import {
  FeatureFlagCard,
  SettingToggleRow,
  SettingsSection,
} from "@/components/dashboard/system-management/SettingsCards";
import { useAuth } from "@/components/auth/AuthProvider";
import { isSuperAdmin } from "@/lib/roles";
import { timeAgo } from "@/lib/admin-format";
import type { Option } from "@/lib/startup-profile-options";
import {
  DEFAULT_SYSTEM_SETTINGS,
  fetchSystemSettings,
  updateSystemSettings,
} from "@/services/system-management.service";
import type { PlatformFlags, SystemSettings, TrialSettings } from "@/types/api.types";

/**
 * Every setting rendered on this screen is declared below — to add, remove or reword one,
 * edit only these lists (same idea as `suggestion-weights/page.tsx`'s PARAMETERS). The
 * shipped values live in `DEFAULT_SYSTEM_SETTINGS` (services/system-management.service.ts).
 */

/** OTP delivery gateways. PLACEHOLDER list — replace with the backend's provider enum. */
const OTP_PROVIDER_OPTIONS: Option[] = [
  { value: "twilio_global_sms", label: "Twilio Global SMS" },
  { value: "message_bird", label: "MessageBird" },
  { value: "aws_sns", label: "AWS SNS" },
];

/** Fallback gateway used when the primary provider fails. */
const OTP_FAILOVER_OPTIONS: Option[] = [
  { value: "aws_sns_secondary", label: "AWS SNS (Secondary)" },
  { value: "sendgrid_email", label: "SendGrid Email" },
  { value: "none", label: "No Failover" },
];

/** The three switches in the Trial Management card. */
const TRIAL_TOGGLES: { key: keyof TrialSettings; label: string; description: string }[] = [
  { key: "manualExtension", label: "Manual Extension", description: "Allows support to extend active trials" },
  { key: "autoDowngrade", label: "Auto Downgrade", description: "Move to free tier on expiry" },
  { key: "expiryNotifications", label: "Expiry Notifications", description: "Email alerts 48h before end" },
];

/** The six feature-flag tiles in the Platform Controls grid. */
const PLATFORM_FLAGS: { key: keyof PlatformFlags; label: string; description: string; icon: string }[] = [
  { key: "maintenanceMode",      label: "Maintenance Mode",      description: "Lock all public access and show status page.", icon: "engineering" },
  { key: "registrationOpen",     label: "Registration Open",     description: "Allow new users to create accounts.",          icon: "how_to_reg"  },
  { key: "aiMatchingEngine",     label: "AI Matching Engine",    description: "Enable automated connection suggestions.",     icon: "memory"      },
  { key: "externalApiAccess",    label: "External API Access",   description: "Allow 3rd party developer integrations.",      icon: "api"         },
  { key: "experimentalFeatures", label: "Experimental Features", description: "Show beta labels and upcoming components.",    icon: "science"     },
  { key: "realTimeMetrics",      label: "Real-time Metrics",     description: "Update dashboard counters in real-time.",      icon: "query_stats" },
];

/** Groups of `SystemSettings` that hold editable fields. */
type Group = "otp" | "trial" | "flags";

/** Number inputs: empty string → 0 rather than NaN. */
const toNumber = (raw: string) => (raw === "" ? 0 : Number(raw));

export default function SystemManagementPage() {
  const router = useRouter();
  const { role, isLoaded } = useAuth();

  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SYSTEM_SETTINGS);
  /** Last fetched/saved snapshot — drives the dirty check. */
  const [initial, setInitial] = useState<SystemSettings>(DEFAULT_SYSTEM_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // True while the settings endpoint is unavailable — the form shows defaults instead.
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (isLoaded && !isSuperAdmin(role)) router.replace("/dashboard");
  }, [isLoaded, role, router]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSystemSettings();
      setSettings(data);
      setInitial(data);
      setOffline(false);
    } catch {
      // The backend endpoint doesn't exist yet, so a failure falls back to the shipped
      // defaults and flags the page as not-yet-connected. DELETE this fallback (and
      // `offline`) once ADMIN_SYSTEM_SETTINGS is live — `setError` alone is then correct.
      setSettings(DEFAULT_SYSTEM_SETTINGS);
      setInitial(DEFAULT_SYSTEM_SETTINGS);
      setOffline(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load() sets loading; runs once on mount
    void load();
  }, [load]);

  /** The single update path for every control on the screen. */
  const setField = useCallback(
    <G extends Group, K extends keyof SystemSettings[G]>(group: G, key: K, value: SystemSettings[G][K]) => {
      setSettings((prev) => ({ ...prev, [group]: { ...prev[group], [key]: value } }));
    },
    []
  );

  const dirty = JSON.stringify(settings) !== JSON.stringify(initial);

  const handleReset = () => {
    setSettings((prev) => ({ ...DEFAULT_SYSTEM_SETTINGS, otpStats: prev.otpStats }));
    toast.info("Reverted to the default configuration. Save to apply.");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await updateSystemSettings(settings);
      setSettings(saved);
      setInitial(saved);
      setOffline(false);
      toast.success("System settings saved.");
    } catch {
      toast.error("Couldn't save the settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!isLoaded || !isSuperAdmin(role)) return null;

  return (
    <div className="mx-auto max-w-[1280px] px-6 pt-8 md:px-8">
      {/* Header */}
      <div className="mb-8">
        <nav aria-label="Breadcrumb" className="mb-2 flex gap-2 font-label text-[10px] font-bold uppercase tracking-widest">
          <span className="text-outline">Configuration</span>
          <span className="text-outline">/</span>
          <span className="text-surface-tint">System Management</span>
        </nav>
        <h1 className="mb-2 font-headline text-3xl font-bold tracking-[-0.02em] text-on-surface md:text-4xl">
          System Management
        </h1>
        <p className="max-w-2xl text-on-surface-variant">
          Manage platform-wide configuration, security protocols, and trial behaviors across the
          BridgeConnect ecosystem.
        </p>
      </div>

      <AsyncState loading={loading} error={error} onRetry={load}>
        <>
          {offline && (
            <p className="mb-6 flex items-center gap-2 rounded-lg bg-surface-container-low px-4 py-3 text-xs text-on-surface-variant">
              <Icon name="cloud_off" size={16} />
              Showing the default configuration — the settings service isn&apos;t connected yet.
            </p>
          )}

          <div className="space-y-8">
            {/* OTP Configuration */}
            <SettingsSection
              icon="key"
              title="OTP Configuration"
              description="Multi-factor authentication gateway settings"
              action={
                settings.otpStats && (
                  <div className="flex items-center gap-8 rounded-lg bg-surface-container p-4">
                    <div className="flex flex-col">
                      <span className="font-label text-[10px] font-bold uppercase text-outline">Success Rate</span>
                      <span className="font-headline text-lg font-bold text-primary">
                        {settings.otpStats.successRate}%
                      </span>
                    </div>
                    <span className="h-8 w-px bg-outline-variant/30" />
                    <div className="flex flex-col">
                      <span className="font-label text-[10px] font-bold uppercase text-outline">Latency</span>
                      <span className="font-headline text-lg font-bold text-primary">
                        {settings.otpStats.latencySeconds}s
                      </span>
                    </div>
                  </div>
                )
              }
            >
              <div className="grid grid-cols-1 gap-x-12 gap-y-8 md:grid-cols-3">
                <div className="space-y-6">
                  <Select
                    id="otp-primary-provider"
                    variant="underline"
                    label="Primary Provider"
                    options={OTP_PROVIDER_OPTIONS}
                    value={settings.otp.primaryProvider}
                    onChange={(v) => setField("otp", "primaryProvider", v)}
                  />
                  <Select
                    id="otp-failover-provider"
                    variant="underline"
                    label="Failover Provider"
                    options={OTP_FAILOVER_OPTIONS}
                    value={settings.otp.failoverProvider}
                    onChange={(v) => setField("otp", "failoverProvider", v)}
                  />
                </div>

                <div className="space-y-6">
                  <Input
                    id="otp-max-attempts"
                    variant="underline"
                    type="number"
                    min={1}
                    label="Max Attempts"
                    value={settings.otp.maxAttempts}
                    onChange={(e) => setField("otp", "maxAttempts", toNumber(e.target.value))}
                  />
                  <Input
                    id="otp-expiry"
                    variant="underline"
                    type="number"
                    min={30}
                    label="Expiry Duration (sec)"
                    value={settings.otp.expirySeconds}
                    onChange={(e) => setField("otp", "expirySeconds", toNumber(e.target.value))}
                  />
                </div>

                <div className="space-y-6">
                  <Input
                    id="otp-cooldown"
                    variant="underline"
                    type="number"
                    min={0}
                    label="Cooldown Period (min)"
                    value={settings.otp.cooldownMinutes}
                    onChange={(e) => setField("otp", "cooldownMinutes", toNumber(e.target.value))}
                  />
                  <div className="pt-4">
                    <SettingToggleRow
                      label="Sandbox Mode"
                      description="Skip real SMS sending"
                      checked={settings.otp.sandboxMode}
                      onChange={(v) => setField("otp", "sandboxMode", v)}
                    />
                  </div>
                </div>
              </div>
            </SettingsSection>

            {/* Trial Management */}
            <SettingsSection
              icon="timer"
              title="Trial Management"
              description="Control user onboarding and conversion windows"
            >
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12">
                <div className="space-y-6 rounded-lg bg-surface-container-low p-6">
                  <Input
                    id="trial-duration"
                    variant="underline"
                    type="number"
                    min={0}
                    label="Default Duration (Days)"
                    value={settings.trial.defaultDurationDays}
                    onChange={(e) => setField("trial", "defaultDurationDays", toNumber(e.target.value))}
                  />
                  <Input
                    id="trial-max-extension"
                    variant="underline"
                    type="number"
                    min={0}
                    label="Hard Cap / Max Extension"
                    value={settings.trial.maxExtensionDays}
                    onChange={(e) => setField("trial", "maxExtensionDays", toNumber(e.target.value))}
                  />
                </div>

                <div className="space-y-6">
                  {TRIAL_TOGGLES.map((toggle, i) => (
                    <SettingToggleRow
                      key={toggle.key}
                      label={toggle.label}
                      description={toggle.description}
                      divider={i < TRIAL_TOGGLES.length - 1}
                      checked={settings.trial[toggle.key] as boolean}
                      onChange={(v) => setField("trial", toggle.key, v)}
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
            >
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {PLATFORM_FLAGS.map((flag) => (
                  <FeatureFlagCard
                    key={flag.key}
                    icon={flag.icon}
                    label={flag.label}
                    description={flag.description}
                    checked={settings.flags[flag.key]}
                    onChange={(v) => setField("flags", flag.key, v)}
                  />
                ))}
              </div>
            </SettingsSection>
          </div>

          {/* Sticky action bar */}
          <div className="sticky bottom-0 z-10 mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-outline-variant/30 bg-surface/90 py-4 backdrop-blur-xl">
            <p className="text-xs italic text-on-surface-variant">
              {settings.lastSavedAt
                ? `Last saved: ${timeAgo(settings.lastSavedAt)}${settings.lastSavedBy ? ` by ${settings.lastSavedBy}` : ""}`
                : "No changes saved yet."}
            </p>
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={handleReset} disabled={saving}>
                Reset Defaults
              </Button>
              <Button variant="primary" onClick={handleSave} disabled={!dirty || saving}>
                {saving ? "Saving…" : "Save All Changes"}
              </Button>
            </div>
          </div>
        </>
      </AsyncState>
    </div>
  );
}
