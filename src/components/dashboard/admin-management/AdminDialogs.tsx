"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/modal/Modal";
import { Drawer } from "@/components/ui/Drawer";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/Select";
import { ToggleSwitch } from "@/components/ui/ToggleSwitch";
import { Field } from "@/components/dashboard/UserDetailDrawer";
import { StatusPill } from "@/components/dashboard/kyc-status";
import { initials, formatDate, timeAgo } from "@/lib/admin-format";
import { EMAIL_REGEX, PASSWORD_REGEX, PHONE_REGEX } from "@/lib/validation";
import { createAdmin, updateAdminPermissions } from "@/services/admin.service";
import type { AdminAccount, AdminAccountStatus, CreateAdminPayload } from "@/types/api.types";
import type { ApiError } from "@/lib/axios";

/**
 * The three dialogs of Admin Management — the create form, the read-only detail drawer and
 * the permissions editor. They're only used by that page and share the permission grid, so
 * they live together (same idea as `system-management/SettingsCards.tsx`).
 *
 * The module + role-profile lists below are the screen's single source of truth; the page
 * imports them from here (it can't own them — it imports this file).
 */

/** Modules an admin can be granted. PLACEHOLDER keys — align with the backend enum. */
export const ADMIN_MODULES: { key: string; label: string }[] = [
  { key: "kyc_review", label: "KYC Review" },
  { key: "faq_management", label: "FAQ Management" },
  { key: "user_management", label: "User Management" },
];

/** Named permission presets shown in the "Role Profile" dropdown. */
export const ROLE_PROFILE_OPTIONS = [
  { value: "compliance_analyst", label: "Compliance Analyst" },
  { value: "support_agent", label: "Support Agent" },
  { value: "operations_manager", label: "Operations Manager" },
  { value: "platform_admin", label: "Platform Admin" },
];

/** Human label for a stored module key (falls back to the raw key). */
export function moduleLabel(key: string): string {
  return ADMIN_MODULES.find((m) => m.key === key)?.label ?? key;
}

/** Human label for a stored role-profile value. */
export function roleProfileLabel(value?: string): string | undefined {
  if (!value) return undefined;
  return ROLE_PROFILE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

/** Status pill metadata — neutral icon + label, per the theme's no-status-color rule. */
export const ADMIN_STATUS_META: Record<AdminAccountStatus, { label: string; icon: string }> = {
  ACTIVE: { label: "Active", icon: "check_circle" },
  SUSPENDED: { label: "Suspended", icon: "block" },
};

/** Inline error message under a field. */
function ErrorText({ children }: { children?: string }) {
  if (!children) return null;
  return <p className="mt-1 px-1 text-xs font-medium text-error">{children}</p>;
}

/** The module checkbox grid — shared by the create form and the permissions editor. */
function PermissionGrid({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  const toggle = (key: string) =>
    onChange(value.includes(key) ? value.filter((k) => k !== key) : [...value, key]);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {ADMIN_MODULES.map((mod) => {
        const checked = value.includes(mod.key);
        return (
          <button
            key={mod.key}
            type="button"
            role="checkbox"
            aria-checked={checked}
            onClick={() => toggle(mod.key)}
            className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left text-sm transition-all ${
              checked
                ? "border-primary bg-primary-container/40 ring-2 ring-primary/15"
                : "border-outline-variant/30 bg-surface-container-low hover:border-outline-variant/60"
            }`}
          >
            <span
              className={`flex size-5 shrink-0 items-center justify-center rounded border ${
                checked ? "border-primary bg-primary text-on-primary" : "border-outline-variant"
              }`}
            >
              {checked && <Icon name="check" size={14} />}
            </span>
            <span className="font-medium text-on-surface">{mod.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Create New Admin                                                           */
/* -------------------------------------------------------------------------- */

type CreateErrors = Partial<Record<keyof CreateAdminPayload, string>>;

const EMPTY_FORM: CreateAdminPayload = {
  name: "",
  email: "",
  mobileNumber: "",
  password: "",
  permissions: [],
  sendWelcomeEmail: true,
};

interface CreateAdminModalProps {
  open: boolean;
  onClose: () => void;
  /** Called after a successful create so the page can refresh its list. */
  onCreated: () => void;
}

/** "Create New Admin" form — assigns a new member to the administrative dashboard. */
export function CreateAdminModal({ open, onClose, onCreated }: CreateAdminModalProps) {
  const [form, setForm] = useState<CreateAdminPayload>(EMPTY_FORM);
  const [errors, setErrors] = useState<CreateErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  // Reset to a clean form each time the dialog opens.
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- clears the form on open
    setForm(EMPTY_FORM);
    setErrors({});
    setShowPassword(false);
  }, [open]);

  const set = <K extends keyof CreateAdminPayload>(key: K, value: CreateAdminPayload[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const validate = (): CreateErrors => {
    const found: CreateErrors = {};
    if (!form.name.trim()) found.name = "Full name is required.";
    if (!EMAIL_REGEX.test(form.email.trim())) found.email = "Enter a valid email address.";
    if (!PHONE_REGEX.test(form.mobileNumber.trim())) found.mobileNumber = "Enter a valid 10-digit mobile number.";
    if (!PASSWORD_REGEX.test(form.password))
      found.password = "Min 8 characters with upper, lower, number and symbol.";
    if (form.permissions.length === 0) found.permissions = "Grant at least one module.";
    return found;
  };

  const handleSubmit = async () => {
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    try {
      await createAdmin({ ...form, name: form.name.trim(), email: form.email.trim() });
      toast.success(`${form.name.trim()} was added as an admin.`);
      onCreated();
      onClose();
    } catch (err) {
      toast.error((err as ApiError).message || "Couldn't create the admin. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create New Admin"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex h-11 items-center rounded-xl px-5 text-sm font-bold text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="cta-gradient flex h-11 items-center gap-2 rounded-xl px-6 text-sm font-bold text-on-primary shadow-lg shadow-primary/20 transition-all hover:scale-[1.01] disabled:opacity-50 disabled:hover:scale-100"
          >
            <Icon name="admin_panel_settings" size={18} />
            {saving ? "Creating…" : "Create Admin"}
          </button>
        </>
      }
    >
      <p className="mb-6 text-sm text-on-surface-variant">
        Assign a new member to the administrative dashboard.
      </p>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <Input
            id="admin-name"
            variant="underline"
            label="Full Name"
            placeholder="e.g. Robert Fox"
            value={form.name}
            error={errors.name}
            onChange={(e) => set("name", e.target.value)}
          />
          <ErrorText>{errors.name}</ErrorText>
        </div>
        <div>
          <Input
            id="admin-email"
            variant="underline"
            type="email"
            label="Email Address"
            placeholder="robert@bridgeconnect.com"
            value={form.email}
            error={errors.email}
            onChange={(e) => set("email", e.target.value)}
          />
          <ErrorText>{errors.email}</ErrorText>
        </div>
        <div>
          <Input
            id="admin-mobile"
            variant="underline"
            type="tel"
            label="Mobile Number"
            placeholder="9876543210"
            value={form.mobileNumber}
            error={errors.mobileNumber}
            onChange={(e) => set("mobileNumber", e.target.value)}
          />
          <ErrorText>{errors.mobileNumber}</ErrorText>
        </div>
        <div>
          <Input
            id="admin-password"
            variant="underline"
            type={showPassword ? "text" : "password"}
            label="Password"
            placeholder="••••••••••"
            value={form.password}
            error={errors.password}
            onChange={(e) => set("password", e.target.value)}
            adornment={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <Icon name={showPassword ? "visibility_off" : "visibility"} size={20} />
              </button>
            }
          />
          <ErrorText>{errors.password}</ErrorText>
        </div>
      </div>

      <div className="mt-6">
        <p className="mb-3 font-label text-[11px] font-bold uppercase tracking-wider text-on-secondary-container">
          Module Permissions
        </p>
        <PermissionGrid value={form.permissions} onChange={(next) => set("permissions", next)} />
        <ErrorText>{errors.permissions}</ErrorText>
      </div>

      <div className="mt-6 flex items-center justify-between gap-4 rounded-xl bg-surface-container-low px-4 py-3">
        <div className="flex items-center gap-3">
          <Icon name="mail" size={20} className="text-primary" />
          <div>
            <p className="text-sm font-semibold text-on-surface">Send Welcome Email</p>
            <p className="text-xs text-on-surface-variant">User will receive login credentials via email</p>
          </div>
        </div>
        <ToggleSwitch
          checked={form.sendWelcomeEmail}
          onChange={(v) => set("sendWelcomeEmail", v)}
          label="Send Welcome Email"
          hideLabel
        />
      </div>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/*  Detail drawer                                                              */
/* -------------------------------------------------------------------------- */

/** Read-only profile for one admin (the row's "View Details" action). */
export function AdminDetailDrawer({ admin, onClose }: { admin: AdminAccount | null; onClose: () => void }) {
  if (!admin) return null;
  const phone = admin.mobileNumber
    ? `${admin.countryCode ? `${admin.countryCode} ` : ""}${admin.mobileNumber}`
    : undefined;

  return (
    <Drawer open onClose={onClose} title={admin.name} subtitle={admin.email}>
      <div className="mb-5 flex items-center gap-4">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary-container text-lg font-bold text-on-primary-container">
          {initials(admin.name)}
        </div>
        <StatusPill {...ADMIN_STATUS_META[admin.status]} />
      </div>

      <div className="divide-y divide-outline/5">
        <Field icon="badge" label="Role" value={admin.role === "super_admin" ? "Super Admin" : "Admin"} />
        <Field icon="workspace_premium" label="Role Profile" value={roleProfileLabel(admin.roleProfile)} />
        <Field icon="mail" label="Email" value={admin.email} />
        <Field icon="call" label="Mobile" value={phone} />
        <Field icon="event" label="Created" value={admin.createdAt ? formatDate(admin.createdAt) : undefined} />
        <Field icon="schedule" label="Last Login" value={admin.lastLoginAt ? timeAgo(admin.lastLoginAt) : undefined} />
      </div>

      <div className="mt-5">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-on-surface-variant">
          Module Permissions
        </p>
        {admin.role === "super_admin" ? (
          <p className="text-sm font-semibold text-on-surface">All modules</p>
        ) : admin.permissions.length === 0 ? (
          <p className="text-sm text-on-surface-variant">No modules granted.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {admin.permissions.map((key) => (
              <span
                key={key}
                className="rounded-lg bg-secondary-container px-2.5 py-1 text-xs font-medium text-on-secondary-container"
              >
                {moduleLabel(key)}
              </span>
            ))}
          </div>
        )}
      </div>
    </Drawer>
  );
}

/* -------------------------------------------------------------------------- */
/*  Permissions editor                                                         */
/* -------------------------------------------------------------------------- */

interface EditPermissionsModalProps {
  admin: AdminAccount | null;
  onClose: () => void;
  /** Called with the saved values so the page can update the row in place. */
  onSaved: (id: string, roleProfile: string, permissions: string[]) => void;
}

/** Edit one admin's role profile + module permissions (the row's lock action). */
export function EditPermissionsModal({ admin, onClose, onSaved }: EditPermissionsModalProps) {
  const [roleProfile, setRoleProfile] = useState("");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Seed the form from the selected admin each time a new one is opened.
  useEffect(() => {
    if (!admin) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- seeds the form from the row
    setRoleProfile(admin.roleProfile ?? ROLE_PROFILE_OPTIONS[0].value);
    setPermissions(admin.permissions);
  }, [admin]);

  if (!admin) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateAdminPermissions(admin.id, roleProfile, permissions);
      onSaved(admin.id, roleProfile, permissions);
      toast.success(`Permissions updated for ${admin.name}.`);
      onClose();
    } catch (err) {
      toast.error((err as ApiError).message || "Couldn't update permissions. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Edit Permissions"
      maxWidthClass="max-w-xl"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex h-11 items-center rounded-xl px-5 text-sm font-bold text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="cta-gradient flex h-11 items-center gap-2 rounded-xl px-6 text-sm font-bold text-on-primary shadow-lg shadow-primary/20 transition-all hover:scale-[1.01] disabled:opacity-50 disabled:hover:scale-100"
          >
            <Icon name="save" size={18} />
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </>
      }
    >
      <p className="mb-6 text-sm text-on-surface-variant">
        Control which modules <span className="font-semibold text-on-surface">{admin.name}</span> can reach.
      </p>

      <Select
        id="edit-role-profile"
        variant="underline"
        label="Role Profile"
        options={ROLE_PROFILE_OPTIONS}
        value={roleProfile}
        onChange={setRoleProfile}
      />

      <div className="mt-6">
        <p className="mb-3 font-label text-[11px] font-bold uppercase tracking-wider text-on-secondary-container">
          Module Permissions
        </p>
        <PermissionGrid value={permissions} onChange={setPermissions} />
      </div>
    </Modal>
  );
}
