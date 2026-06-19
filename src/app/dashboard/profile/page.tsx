"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Loader } from "@/components/common/loader";
import { getUserProfile, type ProfileField } from "@/services/user.service";
import type { ApiError } from "@/lib/axios";

// ─── helpers ─────────────────────────────────────────────────────────────────

function normalizeValue(field: ProfileField): string | string[] {
  if (field.type === "array") {
    if (Array.isArray(field.value)) return field.value;
    if (typeof field.value === "string" && field.value.trim()) {
      try {
        const parsed = JSON.parse(field.value);
        if (Array.isArray(parsed)) return parsed;
      } catch { /* noop */ }
      return field.value.split(",").map((s) => s.trim()).filter(Boolean);
    }
    return [];
  }
  if (Array.isArray(field.value)) return field.value.join(", ");
  return field.value ?? "";
}

function buildPayload(fields: ProfileField[], localValues: Record<string, string | string[]>) {
  return Object.fromEntries(
    fields.map((f) => [f.columnName, localValues[f.columnName] ?? normalizeValue(f)]),
  );
}

// ─── Toggle Switch ────────────────────────────────────────────────────────────

function ToggleSwitch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      id="profile-edit-toggle"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="group flex items-center gap-2.5 select-none focus:outline-none"
    >
      <span className="text-sm font-semibold text-on-surface-variant">{label}</span>
      {/* Track */}
      <span
        className={`relative flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ${
          checked ? "bg-primary" : "bg-outline-variant/60"
        }`}
      >
        {/* Thumb */}
        <span
          className={`absolute left-0.5 size-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}

// ─── individual field ─────────────────────────────────────────────────────────

interface FieldProps {
  field: ProfileField;
  value: string | string[];
  editMode: boolean;
  onChange: (col: string, val: string | string[]) => void;
}

function ProfileFieldRow({ field, value, editMode, onChange }: FieldProps) {
  const id = `profile-field-${field.columnName}`;
  const locked = !field.isEditable;
  const disabled = !editMode || locked;
  const label = field.label ?? field.columnName;

  // ── array / multi-select ──
  if (field.type === "array") {
    const selected = Array.isArray(value) ? value : [];
    const options = field.options ?? [];

    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <label
            htmlFor={id}
            className="px-1 font-label text-xs font-bold uppercase tracking-wide text-on-surface-variant"
          >
            {label}
          </label>
          {locked && <Icon name="lock" size={13} className="text-outline-variant" />}
        </div>

        {disabled ? (
          /* Read-only chip display */
          <div className="flex min-h-10 flex-wrap gap-1.5 rounded-lg border border-outline-variant/30 bg-surface-container-low px-3.5 py-2">
            {selected.length === 0 ? (
              <span className="text-sm text-outline-variant">—</span>
            ) : (
              selected.map((v) => {
                const lbl = options.find((o) => o.value === v)?.label ?? v;
                return (
                  <span
                    key={v}
                    className="rounded-lg bg-secondary-container px-2.5 py-0.5 text-xs font-semibold text-on-secondary-container"
                  >
                    {lbl}
                  </span>
                );
              })
            )}
          </div>
        ) : (
          <Select
            id={id}
            multiple
            options={options}
            value={selected}
            onChange={(val) => onChange(field.columnName, val)}
          />
        )}
      </div>
    );
  }

  // ── textarea ──
  if (field.type === "textarea") {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <label
            htmlFor={id}
            className="px-1 font-label text-xs font-bold uppercase tracking-wide text-on-surface-variant"
          >
            {label}
          </label>
          {locked && <Icon name="lock" size={13} className="text-outline-variant" />}
        </div>
        <Textarea
          id={id}
          rows={3}
          disabled={disabled}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(field.columnName, e.target.value)}
          placeholder={disabled ? "—" : `Enter ${label.toLowerCase()}`}
          className={disabled ? "cursor-default opacity-60" : ""}
        />
      </div>
    );
  }

  // ── all other types → Input ──
  const htmlType =
    field.type === "number" ? "number"
    : field.type === "email" ? "email"
    : field.type === "url" ? "url"
    : "text";

  return (
    <Input
      id={id}
      label={label}
      type={htmlType}
      disabled={disabled}
      value={typeof value === "string" ? value : ""}
      onChange={(e) => onChange(field.columnName, e.target.value)}
      placeholder={disabled ? "" : `Enter ${label.toLowerCase()}`}
      className={disabled ? "cursor-default opacity-60" : ""}
      adornment={
        locked ? <Icon name="lock" size={15} className="text-outline-variant" /> : undefined
      }
    />
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const [fields, setFields] = useState<ProfileField[]>([]);
  const [localValues, setLocalValues] = useState<Record<string, string | string[]>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getUserProfile();
      const fetched = res.data ?? [];
      setFields(fetched);
      const init: Record<string, string | string[]> = {};
      for (const f of fetched) init[f.columnName] = normalizeValue(f);
      setLocalValues(init);
    } catch (err) {
      toast.error((err as ApiError).message ?? "Failed to load profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const handleChange = (col: string, val: string | string[]) => {
    setLocalValues((prev) => ({ ...prev, [col]: val }));
  };

  const handleToggleEdit = (on: boolean) => {
    if (!on) {
      // Discard changes: reset to fetched values
      const init: Record<string, string | string[]> = {};
      for (const f of fields) init[f.columnName] = normalizeValue(f);
      setLocalValues(init);
    }
    setEditMode(on);
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const _payload = buildPayload(fields, localValues);
      void _payload; // API not yet live — will be wired when ready
      await new Promise((r) => setTimeout(r, 700));
      toast.success("Profile saved successfully!");
      setEditMode(false);
    } catch (err) {
      toast.error((err as ApiError).message ?? "Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* ── Page Header ── */}
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-outline-variant/20 bg-surface-container-lowest px-8 py-5">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-primary-container text-on-primary-container">
            <Icon name="account_circle" size={24} />
          </div>
          <div>
            <h1 className="font-headline text-xl font-bold text-on-surface">My Profile</h1>
            <p className="text-xs text-on-surface-variant">View and manage your profile details</p>
          </div>
        </div>

        {/* Edit toggle in top-right */}
        {!loading && fields.length > 0 && (
          <ToggleSwitch
            checked={editMode}
            onChange={handleToggleEdit}
            label={editMode ? "Editing" : "Edit"}
          />
        )}
      </div>

      {/* ── Body ── */}
      <div className="thin-scrollbar flex-1 overflow-y-auto px-8 py-7">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader size="medium" />
          </div>
        ) : fields.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-center text-on-surface-variant">
            <Icon name="person_off" size={48} />
            <p className="text-sm">No profile data found.</p>
            <button
              type="button"
              onClick={fetchProfile}
              className="mt-1 rounded-xl border border-outline-variant/30 px-4 py-2 text-sm font-semibold transition-colors hover:bg-surface-container"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="mx-auto max-w-4xl">
            {/* Edit-mode banner */}
            {editMode && (
              <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-primary/20 bg-primary-container/30 px-4 py-3 text-sm text-on-primary-container">
                <Icon name="edit_note" size={18} />
                <span>Edit mode is on — make your changes and click <strong>Save Changes</strong> below.</span>
              </div>
            )}

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {fields.map((field) => (
                <div
                  key={field.columnName}
                  className={field.type === "textarea" || field.type === "array" ? "sm:col-span-2" : ""}
                >
                  <ProfileFieldRow
                    field={field}
                    value={localValues[field.columnName] ?? normalizeValue(field)}
                    editMode={editMode}
                    onChange={handleChange}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Footer — only in edit mode ── */}
      {editMode && (
        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-outline-variant/20 bg-surface-container-lowest px-8 py-4">
          <button
            type="button"
            onClick={() => handleToggleEdit(false)}
            className="flex h-10 items-center gap-1.5 rounded-xl border border-outline-variant/30 px-5 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container"
          >
            Discard
          </button>
          <Button
            id="profile-save-btn"
            disabled={saving}
            onClick={handleSave}
            className="h-10 px-6 text-sm"
          >
            {saving ? (
              <Loader size="small" />
            ) : (
              <>
                <Icon name="save" size={16} />
                Save Changes
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
