"use client";

import { useState, useEffect, useCallback } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import { initials } from "@/lib/admin-format";
import { KYC_STATUS_META, StatusPill, VERIFY_META } from "@/components/dashboard/kyc-status";
import { fetchUserLimitConfig, updateUserLimitConfig } from "@/services/admin.service";
import type { AdminUserListItem } from "@/types/api.types";
import type { ApiError } from "@/lib/axios";

/* -------------------------------------------------------------------------- */
/*  Helper components                                                          */
/* -------------------------------------------------------------------------- */

/** One label/value row inside the drawer. */
function Field({ icon, label, value }: { icon: string; label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2.5">
      <Icon name={icon} size={20} className="mt-0.5 shrink-0 text-on-surface-variant" />
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">{label}</p>
        <p className="break-words text-sm font-semibold text-on-surface">{value}</p>
      </div>
    </div>
  );
}

/** A "<thing> — Verified/Pending" row reusing the shared StatusPill. */
function VerifyRow({ icon, label, verified }: { icon: string; label: string; verified: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-container-low px-3 py-2.5">
      <span className="flex items-center gap-2 text-sm font-semibold text-on-surface">
        <Icon name={icon} size={18} className="text-on-surface-variant" />
        {label}
      </span>
      <StatusPill {...(verified ? VERIFY_META.VERIFIED : VERIFY_META.UNVERIFIED)} />
    </div>
  );
}

/** Labeled number input for the limit config section. */
function LimitInput({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled: boolean;
}) {
  return (
    <div className="rounded-xl bg-surface-container-low px-3 py-2.5">
      <p className="mb-1.5 text-xs font-medium text-on-surface-variant">{label}</p>
      <Input
        type="number"
        min="0"
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder="0"
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

interface LimitFields {
  allowed_connections: string;
  allowed_free_trial_days: string;
  allowed_premium_days: string;
}

const LIMIT_EMPTY: LimitFields = {
  allowed_connections: "",
  allowed_free_trial_days: "",
  allowed_premium_days: "",
};

/* -------------------------------------------------------------------------- */
/*  Main component                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Right-side drawer showing one user's details + their configurable connection
 * limits. Basic info is rendered directly from the passed-in list row (no fetch).
 * The limit config section fetches from /admin/users/:userId/limit-config when
 * the drawer opens and returns system defaults when no custom config exists yet.
 */
export function UserDetailDrawer({ user, onClose }: { user: AdminUserListItem | null; onClose: () => void }) {
  const phone = user ? `${user.countryCode ? `${user.countryCode} ` : ""}${user.mobileNumber ?? ""}`.trim() : "";

  // ── Limit config state ────────────────────────────────────────────────────
  const [limits, setLimits] = useState<LimitFields>(LIMIT_EMPTY);
  const [limitLoading, setLimitLoading] = useState(false);
  const [limitSaving, setLimitSaving] = useState(false);
  const [limitError, setLimitError] = useState<string | null>(null);
  const [limitSuccess, setLimitSuccess] = useState(false);

  // Fetch limit config whenever the selected user changes.
  useEffect(() => {
    if (!user?.userId) {
      setLimits(LIMIT_EMPTY);
      setLimitError(null);
      setLimitSuccess(false);
      return;
    }
    setLimitLoading(true);
    setLimitError(null);
    setLimitSuccess(false);
    fetchUserLimitConfig(user.userId)
      .then((config) => {
        setLimits({
          allowed_connections: String(config.allowed_connections),
          allowed_free_trial_days: String(config.allowed_free_trial_days),
          allowed_premium_days: String(config.allowed_premium_days),
        });
      })
      .catch((err: ApiError) => setLimitError(err.message))
      .finally(() => setLimitLoading(false));
  }, [user?.userId]);

  // Auto-clear the success message after 3 seconds.
  useEffect(() => {
    if (!limitSuccess) return;
    const t = setTimeout(() => setLimitSuccess(false), 3000);
    return () => clearTimeout(t);
  }, [limitSuccess]);

  const handleLimitChange = (field: keyof LimitFields) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setLimits((prev) => ({ ...prev, [field]: e.target.value }));
    setLimitError(null);
    setLimitSuccess(false);
  };

  const handleSaveLimits = useCallback(async () => {
    if (!user?.userId) return;
    const payload = {
      allowed_connections: Number(limits.allowed_connections),
      allowed_free_trial_days: Number(limits.allowed_free_trial_days),
      allowed_premium_days: Number(limits.allowed_premium_days),
    };
    if (Object.values(payload).some((v) => isNaN(v) || v < 0 || !Number.isInteger(v))) {
      setLimitError("All values must be non-negative whole numbers.");
      return;
    }
    setLimitSaving(true);
    setLimitError(null);
    try {
      await updateUserLimitConfig(user.userId, payload);
      setLimitSuccess(true);
    } catch (err: unknown) {
      setLimitError((err as ApiError).message ?? "Failed to save limits.");
    } finally {
      setLimitSaving(false);
    }
  }, [user?.userId, limits]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Drawer
      open={user !== null}
      onClose={onClose}
      title={user?.name ?? "User profile"}
      subtitle={user?.companyName}
      footer={null}
    >
      {user && (
        <>
          {/* Identity header */}
          <div className="flex items-center gap-4 pb-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary-container font-headline text-lg font-bold text-on-primary-container">
              {initials(user.name)}
            </div>
            <div className="min-w-0">
              <p className="truncate font-headline text-lg font-bold text-on-surface">{user.name}</p>
              <div className="mt-1">
                <StatusPill {...KYC_STATUS_META[user.kycStatus]} />
              </div>
            </div>
          </div>

          <div className="divide-y divide-outline/10 border-t border-outline/10">
            <Field icon="mail" label="Email" value={user.email} />
            <Field icon="call" label="Phone" value={phone || undefined} />
            <Field icon="corporate_fare" label="Company" value={user.companyName} />
          </div>

          {/* Verification summary */}
          <h3 className="mb-2 mt-6 text-xs font-bold uppercase tracking-wide text-on-surface-variant">Verification</h3>
          <div className="space-y-2">
            <VerifyRow icon="mail" label="Email" verified={user.emailVerified} />
            <VerifyRow icon="call" label="Mobile" verified={user.mobileVerified} />
            <VerifyRow icon="verified_user" label="KYC" verified={user.kycStatus === "VERIFIED"} />
          </div>

          {/* Connection Limits */}
          <h3 className="mb-3 mt-6 text-xs font-bold uppercase tracking-wide text-on-surface-variant">
            Connection Limits
          </h3>

          {limitLoading ? (
            // Skeleton placeholders while the config loads.
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-surface-container-low" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <LimitInput
                label="Connections Allowed"
                value={limits.allowed_connections}
                onChange={handleLimitChange("allowed_connections")}
                disabled={limitSaving}
              />
              <LimitInput
                label="Free Trial Days"
                value={limits.allowed_free_trial_days}
                onChange={handleLimitChange("allowed_free_trial_days")}
                disabled={limitSaving}
              />
              <LimitInput
                label="Premium Days"
                value={limits.allowed_premium_days}
                onChange={handleLimitChange("allowed_premium_days")}
                disabled={limitSaving}
              />

              {limitError && (
                <p className="flex items-center gap-1.5 text-xs font-medium text-error">
                  <Icon name="error" size={14} />
                  {limitError}
                </p>
              )}

              {limitSuccess && (
                <p className="flex items-center gap-1.5 text-xs font-medium text-primary">
                  <Icon name="check_circle" size={14} />
                  Limits saved successfully.
                </p>
              )}

              <button
                type="button"
                onClick={handleSaveLimits}
                disabled={limitSaving || !user.userId}
                className="mt-1 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-on-primary transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {limitSaving ? "Saving…" : "Save Limits"}
              </button>
            </div>
          )}
        </>
      )}
    </Drawer>
  );
}
