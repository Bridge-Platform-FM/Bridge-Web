"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { Loader } from "@/components/common/loader";
import { FileUploadField } from "@/components/onboarding/FileUploadField";
import { DOC_TYPE, type DocType } from "@/config/docTypes";
import { useAuth } from "@/components/auth/AuthProvider";
import { ProfileFieldRow, PROFILE_SECTIONS, normalizeValue } from "@/app/dashboard/profile/page";
import { saveUserProfile, type SwitchRoleField } from "@/services/user.service";
import {
  clearSwitchRoleHandoff,
  getSwitchRoleHandoff,
  toProfileFields,
  type SwitchRoleHandoff,
} from "@/lib/switch-role-handoff";
import {
  fieldLabel,
  getFieldOptionConfig,
  TEXTAREA_COLUMNS,
  NUMBER_COLUMNS,
} from "@/lib/profile-field-options";
import { isRole, isUserRole, ROLE_META, type Role } from "@/lib/roles";
import { continentForCountry } from "@/lib/countries";
import type { ApiError } from "@/lib/axios";

/**
 * Switch Role — supply the fields the target role is missing.
 *
 * Each role uses a different subset of the (single, wide) `user` row, so moving
 * from Startup to Investor leaves every investor column empty. `POST /auth/switch-role`
 * refuses that switch with HTTP 400 and a `missingFields` list — the required
 * columns with no value yet — and `SwitchUserModal` sends the user here with it
 * rather than dropping them on My Profile to hunt for the blanks themselves.
 *
 * The fields are NOT refetched here — they arrive through the sessionStorage
 * hand-off (`lib/switch-role-handoff.ts`), because switch-role is the only
 * endpoint that produces them and calling it again would just fail the same way.
 * A direct hit on this URL with no hand-off goes back to the dashboard.
 *
 * Saving is `PUT /users/profile` followed by a retry of the switch, so the role
 * only flips once its required fields actually exist — and backing out (Cancel,
 * browser Back, closing the tab) leaves the user on their current role.
 *
 * Fields render through the same `ProfileFieldRow` as My Profile, relabelled with
 * `fieldLabel()` so a question the user first saw during registration is worded
 * identically here.
 */

/** Columns that hold an uploaded document's S3 key, and the scan type each needs. */
const DOCUMENT_COLUMNS: Record<string, DocType> = {
  incorporation_certificate: DOC_TYPE.INCORPORATION_CERTIFICATE,
  pitch_deck_certificate: DOC_TYPE.PITCH_DECK,
};

/** A value the user hasn't supplied — "" for scalars, [] for multi-selects. */
function isBlank(value: string | string[] | undefined): boolean {
  if (value === undefined) return true;
  return Array.isArray(value) ? value.length === 0 : value.trim() === "";
}

/** Numeric columns go over the wire as numbers, matching the registration payload. */
function toPayloadValue(column: string, value: string | string[]): unknown {
  if (Array.isArray(value)) return value;
  if (NUMBER_COLUMNS.has(column)) {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : undefined;
  }
  return value;
}

function SwitchRoleForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { role: currentRole, isLoaded, switchRole } = useAuth();

  const roleParam = searchParams.get("role");
  const target: Role | null = roleParam && isRole(roleParam) && isUserRole(roleParam) ? roleParam : null;

  const [handoff, setHandoff] = useState<SwitchRoleHandoff | null>(null);
  const [ready, setReady] = useState(false);
  const [values, setValues] = useState<Record<string, string | string[]>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // The switch-role response's missingFields, read once from the hand-off. A stale
  // one (different role, expired, none at all) is treated as absent so the guard
  // below sends the user back rather than rendering a form for the wrong role.
  useEffect(() => {
    const stored = getSwitchRoleHandoff();
    const valid = stored && stored.role === target ? stored : null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHandoff(valid);
    if (valid) {
      const seeded: Record<string, string | string[]> = {};
      for (const f of toProfileFields(valid.fields)) seeded[f.columnName] = normalizeValue(f);
      setValues(seeded);
    }
    setReady(true);
  }, [target]);

  // Reachable only from the switch modal, and only for the three user roles. A
  // hand-typed or stale URL (bad ?role=, staff account, no hand-off) goes back to
  // the dashboard rather than rendering a form that can't submit.
  useEffect(() => {
    if (!isLoaded || !ready) return;
    if (!target || !isUserRole(currentRole) || !handoff) {
      router.replace("/dashboard");
    }
  }, [isLoaded, ready, target, currentRole, handoff, router]);

  /** The rendered fields, in the shape `ProfileFieldRow` expects. */
  const fields: SwitchRoleField[] = useMemo(
    () => (handoff ? toProfileFields(handoff.fields) : []),
    [handoff],
  );

  const handleChange = (col: string, val: string | string[]) => {
    setValues((prev) => {
      const next = { ...prev, [col]: val };
      // Country → Continent cascade, same as registration's complete-profile step.
      if (col === "country" && typeof val === "string") {
        const continent = continentForCountry(val);
        if (continent) next.continent = continent;
      }
      return next;
    });
    // Clear this field's error as soon as the user acts on it.
    setErrors((prev) => (prev[col] ? { ...prev, [col]: "" } : prev));
  };

  /**
   * Leave the flow. The hand-off has done its job by now — leaving it behind
   * would let a Back navigation re-open this form for a switch that's settled.
   */
  const finish = useCallback(() => {
    clearSwitchRoleHandoff();
    router.replace("/dashboard");
  }, [router]);

  const handleSave = async () => {
    if (saving || !target || !handoff) return;

    // Required fields first — no request until the form is complete. Locked
    // (company-owned) columns are skipped: nothing on this page can fill them.
    const found: Record<string, string> = {};
    for (const f of fields) {
      if (f.isRequired && f.isEditable && isBlank(values[f.columnName])) {
        found[f.columnName] = `${fieldLabel(f.columnName, f.label)} is required.`;
      }
    }
    if (Object.keys(found).length > 0) {
      setErrors(found);
      toast.error("Please fill in the required fields.");
      return;
    }

    setSaving(true);
    try {
      // PUT /users/profile writes `user` columns only, so company-owned fields
      // (organization name, GST, …) come through as non-editable and are never sent.
      const payload: Record<string, unknown> = {};
      for (const f of fields) {
        if (!f.isEditable) continue;
        const value = values[f.columnName];
        if (isBlank(value)) continue;
        const out = toPayloadValue(f.columnName, value);
        if (out !== undefined) payload[f.columnName] = out;
      }
      if (Object.keys(payload).length > 0) await saveUserProfile(payload);

      // The switch was refused for exactly these fields, so retry it now that they
      // exist. It can still come back Pending/Rejected — that's an admin decision,
      // not a form error, so it ends the flow rather than keeping the user here.
      const outcome = await switchRole(target);
      if (!outcome.switched) {
        if (outcome.status?.toLowerCase() === "rejected") {
          toast.error(outcome.message ?? `Your ${ROLE_META[target].label} role was rejected.`);
        } else {
          toast.info(outcome.message ?? `Your ${ROLE_META[target].label} role has been sent for approval.`);
        }
        finish();
        return;
      }
      toast.success(outcome.message ?? `Switched to ${ROLE_META[target].label}.`);
      finish();
    } catch (err) {
      const e = err as ApiError;
      // The backend reports per-field problems as data:[{field,message}] — map them
      // back onto the inputs instead of dropping them into a single toast.
      const fieldErrs = (e.data as { data?: { field: string; message: string }[] } | undefined)?.data;
      if (Array.isArray(fieldErrs) && fieldErrs.length > 0) {
        setErrors(Object.fromEntries(fieldErrs.map((f) => [f.field, f.message])));
        toast.error(fieldErrs[0].message);
      } else {
        toast.error(e.message ?? "Couldn't save these details. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  // Group into the same sections (and order) as My Profile; anything the backend
  // sends that isn't in a section is shown last so no field silently disappears.
  const { sections, leftover } = useMemo(() => {
    const byColumn = new Map(fields.map((f) => [f.columnName, f]));
    const placed = new Set(PROFILE_SECTIONS.flatMap((s) => s.columns));
    return {
      sections: PROFILE_SECTIONS.map((s) => ({
        title: s.title,
        fields: s.columns
          .map((col) => byColumn.get(col))
          .filter((f): f is SwitchRoleField => Boolean(f)),
      })).filter((s) => s.fields.length > 0),
      leftover: fields.filter((f) => !placed.has(f.columnName)),
    };
  }, [fields]);

  const renderField = (field: SwitchRoleField) => {
    const error = errors[field.columnName];
    const label = fieldLabel(field.columnName, field.label);

    // Uploaded document → the same upload control the registration flow uses.
    const docType = DOCUMENT_COLUMNS[field.columnName];
    if (docType) {
      return (
        <div key={field.columnName} className="sm:col-span-2">
          <FileUploadField
            id={`switch-${field.columnName}`}
            label={label}
            required={field.isRequired}
            optional={!field.isRequired}
            error={error}
            scanType="document"
            docType={docType}
            value={typeof values[field.columnName] === "string" ? values[field.columnName] : ""}
            onChange={(doc) => handleChange(field.columnName, doc?.s3Key ?? "")}
          />
        </div>
      );
    }

    const cfg = getFieldOptionConfig(field.columnName);
    const fullWidth =
      field.type === "textarea" ||
      field.type === "array" ||
      TEXTAREA_COLUMNS.has(field.columnName) ||
      cfg?.multiple === true;

    return (
      <div key={field.columnName} className={fullWidth ? "sm:col-span-2" : ""}>
        <div className="flex flex-col gap-1">
          {/* Relabelled to registration's wording; ProfileFieldRow is untouched. */}
          <ProfileFieldRow
            field={{ ...field, label }}
            value={values[field.columnName] ?? ""}
            editMode
            onChange={handleChange}
          />
          {error && <span className="px-1 text-xs font-medium text-error">{error}</span>}
        </div>
      </div>
    );
  };

  if (!isLoaded || !ready || !target || !handoff) return null;

  return (
    <div className="flex h-full flex-col">
      {/* ── Header ── */}
      <div className="flex shrink-0 items-center gap-3 border-b border-outline-variant/20 bg-surface-container-lowest px-8 py-5">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-primary-container text-on-primary-container">
          <Icon name={ROLE_META[target].icon} size={24} />
        </div>
        <div>
          <h1 className="font-headline text-xl font-bold text-on-surface">
            Switch to {ROLE_META[target].label}
          </h1>
          <p className="text-xs text-on-surface-variant">
            We need a few more details before your account can act as a{" "}
            {ROLE_META[target].label}.
          </p>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="thin-scrollbar flex-1 overflow-y-auto px-8 py-7">
        <div className="mx-auto max-w-4xl">
          {fields.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3 text-center text-on-surface-variant">
              <Icon name="task_alt" size={48} />
              <p className="text-sm">Nothing else is needed for this role.</p>
            </div>
          ) : (
            <>
              <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-primary/20 bg-primary-container/30 px-4 py-3 text-sm text-on-primary-container">
                <Icon name="info" size={18} />
                <span>
                  Your account stays a {currentRole ? ROLE_META[currentRole].label : "user"} until
                  you save.
                </span>
              </div>

              <div className="flex flex-col gap-8">
                {sections.map((section) => (
                  <section key={section.title} className="flex flex-col gap-4">
                    <h3 className="border-b border-outline-variant/20 pb-2 font-headline text-sm font-bold uppercase tracking-wide text-on-surface">
                      {section.title}
                    </h3>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      {section.fields.map(renderField)}
                    </div>
                  </section>
                ))}

                {leftover.length > 0 && (
                  <section className="flex flex-col gap-4">
                    <h3 className="border-b border-outline-variant/20 pb-2 font-headline text-sm font-bold uppercase tracking-wide text-on-surface">
                      Additional Information
                    </h3>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      {leftover.map(renderField)}
                    </div>
                  </section>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Footer ── */}
      {fields.length > 0 && (
        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-outline-variant/20 bg-surface-container-lowest px-8 py-4">
          <button
            type="button"
            onClick={finish}
            disabled={saving}
            className="flex h-10 items-center gap-1.5 rounded-xl border border-outline-variant/30 px-5 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <Button
            id="switch-role-save-btn"
            disabled={saving}
            onClick={handleSave}
            className="h-10 px-6 text-sm"
          >
            {saving ? (
              <Loader size="small" />
            ) : (
              <>
                <Icon name="swap_horiz" size={16} />
                Save &amp; Switch
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

/** `useSearchParams` requires a Suspense boundary in the App Router. */
export default function SwitchRolePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center">
          <Loader size="medium" />
        </div>
      }
    >
      <SwitchRoleForm />
    </Suspense>
  );
}
