"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { ToggleSwitch } from "@/components/ui/ToggleSwitch";

/**
 * The three building blocks of the System Management screen. They're only ever used
 * together, so they share a file (same idea as `dashboard/kyc-status.tsx`):
 *   SettingsSection  — the card shell with the tonal icon header
 *   SettingToggleRow — label/description left, switch right
 *   FeatureFlagCard  — one tile in the Platform Controls grid
 */

interface SettingsSectionProps {
  /** Material Symbols Outlined icon shown in the tonal tile. */
  icon: string;
  title: string;
  description: string;
  /** Optional right-aligned slot in the header (e.g. the OTP delivery stats chip). */
  action?: React.ReactNode;
  children: React.ReactNode;
}

/** One System Management card: tonal icon tile + title/description, then its controls. */
export function SettingsSection({ icon, title, description, action, children }: SettingsSectionProps) {
  return (
    <Card surface="lowest" ambient={false} padding="none" className="border border-outline-variant/20 p-6 md:p-8">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-surface-container-low text-primary">
            <Icon name={icon} size={24} />
          </span>
          <div>
            <h2 className="font-headline text-xl font-semibold text-on-surface">{title}</h2>
            <p className="text-sm text-on-surface-variant">{description}</p>
          </div>
        </div>
        {action}
      </header>
      {children}
    </Card>
  );
}

interface SettingToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  /** Draw the hairline rule underneath (used between stacked rows). */
  divider?: boolean;
}

/** Label + description on the left, switch on the right (Trial toggles + OTP sandbox mode). */
export function SettingToggleRow({ label, description, checked, onChange, divider = false }: SettingToggleRowProps) {
  return (
    <div
      className={`flex items-center justify-between gap-4 ${
        divider ? "border-b border-outline-variant/20 pb-4" : ""
      }`}
    >
      <div>
        <span className="text-sm font-semibold text-on-surface">{label}</span>
        <p className="text-xs text-on-surface-variant">{description}</p>
      </div>
      <ToggleSwitch checked={checked} onChange={onChange} label={label} hideLabel />
    </div>
  );
}

interface FeatureFlagCardProps {
  /** Material Symbols Outlined icon name. */
  icon: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

/** One tile in the Platform Controls grid: icon + compact switch above the copy. */
export function FeatureFlagCard({ icon, label, description, checked, onChange }: FeatureFlagCardProps) {
  return (
    <div className="rounded-lg border border-outline-variant/30 bg-surface-container-lowest p-6 transition-colors">
      <div className="mb-4 flex items-start justify-between">
        <Icon name={icon} size={24} className="text-surface-tint" />
        <ToggleSwitch checked={checked} onChange={onChange} label={label} hideLabel size="sm" />
      </div>
      <h3 className="mb-1 text-sm font-bold text-on-surface">{label}</h3>
      <p className="text-xs text-on-surface-variant">{description}</p>
    </div>
  );
}
