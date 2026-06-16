"use client";

import { Drawer } from "@/components/ui/Drawer";
import { Icon } from "@/components/ui/Icon";
import { initials } from "@/lib/admin-format";
import { KYC_STATUS_META, StatusPill, VERIFY_META } from "@/components/dashboard/kyc-status";
import type { AdminUserListItem } from "@/types/api.types";

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

/**
 * Right-side drawer showing one user's details. The `get-user-list` response carries
 * everything we display, so this renders the passed-in row directly (no extra fetch).
 * When a dedicated user-detail endpoint exists, swap to fetching by `user.id`.
 */
export function UserDetailDrawer({ user, onClose }: { user: AdminUserListItem | null; onClose: () => void }) {
  const phone = user ? `${user.countryCode ? `${user.countryCode} ` : ""}${user.mobileNumber ?? ""}`.trim() : "";

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
        </>
      )}
    </Drawer>
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
