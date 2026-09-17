"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type FocusEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Loader } from "@/components/common/loader";
import { FileUploadField } from "@/components/onboarding/FileUploadField";
import { DOC_TYPE, type DocType } from "@/config/docTypes";
import { useAuth } from "@/components/auth/AuthProvider";
import { ProfileFieldRow, PROFILE_SECTIONS, normalizeValue, PhotoField, AmountRangeField } from "@/app/dashboard/profile/page";
import { saveUserProfile, type SwitchRoleField } from "@/services/user.service";
import { verifyCin, verifyGst } from "@/services/auth.service";
import {
  clearSwitchRoleHandoff,
  FIRST_FILL_COMPANY_COLUMNS,
  getSwitchRoleHandoff,
  toProfileFields,
  type SwitchRoleHandoff,
} from "@/lib/switch-role-handoff";
import {
  EMPTY_FOUNDER,
  FoundersEditor,
  normalizeFounders,
  type Founder,
} from "@/components/onboarding/StartupProfileFields";
import { LINKEDIN_URL_PATTERN } from "@/lib/startup-profile-options";
import {
  fieldLabel,
  getFieldOptionConfig,
  TEXTAREA_COLUMNS,
  NUMBER_COLUMNS,
  FUNDING_CURRENCY_COL,
  FUNDING_MIN_COL,
  FUNDING_MAX_COL,
  TICKET_CURRENCY_COL,
  TICKET_MIN_COL,
  TICKET_MAX_COL,
} from "@/lib/profile-field-options";
import { isRole, isUserRole, ROLE_META, type Role } from "@/lib/roles";
import { continentForCountry } from "@/lib/countries";
import { GST_REGEX, CIN_REGEX } from "@/lib/validation";
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from "@/lib/messages";
import type { ApiError } from "@/lib/axios";

type FieldCheckStatus = "idle" | "checking" | "verified";

const GST_COLUMN = "gst_number";
const CIN_COLUMN = "cin_number";
const FOUNDERS_COLUMN = "founders";
const PHOTO_COLUMN = "profile_photo";

const FOLDED_COLUMNS = new Set([
  FUNDING_CURRENCY_COL,
  FUNDING_MAX_COL,
  TICKET_CURRENCY_COL,
  TICKET_MAX_COL,
]);

const LINKEDIN_URL_RE = new RegExp(LINKEDIN_URL_PATTERN, "i");

/**
 * Switch Role — supply the fields the target role is missing.
 *
 * Each role uses a different subset of the (single, wide) `user` row, so moving
 * from Startup to Investor leaves every investor column empty. `POST /auth/switch-role`
 * refuses that switch with HTTP 400 and a `missingFields` list — every
 * unfilled registration column for that role (required and optional, matching
 * complete-profile), and `SwitchUserModal` sends the user here with it
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
 * Empty company GST/CIN are the exception to the company-column lock: B2B
 * requires them, Investor/Startup registration never collected them, and PUT
 * /users/profile will first-fill them after the same verification as sign-up.
 * Startup `founders` is the same first-fill pattern on a user column: field
 * master keeps it locked on My Profile (no repeatable-row editor), so this
 * page unlocks name + LinkedIn rows when the switch-role response lists it.
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

function IdentifierField({
  id,
  label,
  required,
  value,
  error,
  status,
  placeholder,
  onChange,
  onBlur,
}: {
  id: string;
  label: string;
  required: boolean;
  value: string;
  error?: string;
  status: FieldCheckStatus;
  placeholder: string;
  onChange: (value: string) => void;
  onBlur: (e: FocusEvent<HTMLInputElement>) => void;
}) {
  return (
    <Input
      id={id}
      type="text"
      label={label}
      required={required}
      placeholder={placeholder}
      error={error}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      adornment={
        status === "checking" ? (
          <Loader size={16} />
        ) : status === "verified" ? (
          <Icon name="check_circle" size={20} />
        ) : (
          <Icon name="pin" size={20} />
        )
      }
      adornmentClassName={status === "verified" ? "text-primary" : undefined}
    />
  );
}

/** A value the user hasn't supplied — "" for scalars, [] for multi-selects. */
function isBlank(value: string | string[] | undefined): boolean {
  if (value === undefined) return true;
  return Array.isArray(value) ? value.length === 0 : value.trim() === "";
}

function stringValue(values: Record<string, string | string[]>, col: string): string {
  const v = values[col];
  return typeof v === "string" ? v : "";
}

/** Numeric columns go over the wire as numbers, matching the registration payload. */
function toPayloadValue(column: string, value: string | string[]): unknown {
  if (Array.isArray(value)) return value;
  if (NUMBER_COLUMNS.has(column)) {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : undefined;
  }
  if (FIRST_FILL_COMPANY_COLUMNS.has(column)) return value.trim().toUpperCase();
  return value;
}

type FounderRowError = { name?: string; url?: string };

function collectIncomplete(args: {
  fields: SwitchRoleField[];
  values: Record<string, string | string[]>;
  founders: Founder[];
  gstStatus: FieldCheckStatus;
  cinStatus: FieldCheckStatus;
}): { fieldErrors: Record<string, string>; founderRowErrors: FounderRowError[] } {
  const { fields, values, founders, gstStatus, cinStatus } = args;
  const fieldErrors: Record<string, string> = {};
  const founderRowErrors: FounderRowError[] = [];

  for (const f of fields) {
    if (f.columnName === FOUNDERS_COLUMN) continue;
    if (f.isRequired && f.isEditable && isBlank(values[f.columnName])) {
      fieldErrors[f.columnName] = `${fieldLabel(f.columnName, f.label)} is required.`;
    }
  }

  const foundersField = fields.find((f) => f.columnName === FOUNDERS_COLUMN);
  if (foundersField?.isEditable) {
    const cleaned = normalizeFounders(founders);
    if (foundersField.isRequired && cleaned.length === 0) {
      fieldErrors[FOUNDERS_COLUMN] = `${fieldLabel(FOUNDERS_COLUMN, foundersField.label)} is required.`;
    }
    founders.forEach((row, i) => {
      const name = row.name.trim();
      const url = row.url.trim();
      if (!name && !url) return;
      const rowErr: FounderRowError = {};
      if (!name) rowErr.name = "Required.";
      if (!url) rowErr.url = "Required.";
      else if (!LINKEDIN_URL_RE.test(url)) rowErr.url = "Enter a valid LinkedIn URL.";
      if (rowErr.name || rowErr.url) founderRowErrors[i] = rowErr;
    });
  }

  const gstField = fields.find((f) => f.columnName === GST_COLUMN);
  if (gstField?.isEditable && !fieldErrors[GST_COLUMN]) {
    const raw = (typeof values[GST_COLUMN] === "string" ? values[GST_COLUMN] : "").trim().toUpperCase();
    if (gstField.isRequired || raw) {
      if (!GST_REGEX.test(raw)) fieldErrors[GST_COLUMN] = "Enter a valid 15-character GSTIN.";
      else if (gstStatus !== "verified") fieldErrors[GST_COLUMN] = "Please verify your GST number before continuing.";
    }
  }
  const cinField = fields.find((f) => f.columnName === CIN_COLUMN);
  if (cinField?.isEditable && !fieldErrors[CIN_COLUMN]) {
    const raw = (typeof values[CIN_COLUMN] === "string" ? values[CIN_COLUMN] : "").trim().toUpperCase();
    if (cinField.isRequired || raw) {
      if (!CIN_REGEX.test(raw)) fieldErrors[CIN_COLUMN] = "Enter a valid 21-character CIN.";
      else if (cinStatus !== "verified") fieldErrors[CIN_COLUMN] = "Please verify your CIN number before continuing.";
    }
  }

  const applyRange = (minCol: string, maxCol: string) => {
    if (fieldErrors[minCol] || fieldErrors[maxCol]) return;
    const min = parseFloat(stringValue(values, minCol));
    const max = parseFloat(stringValue(values, maxCol));
    if (Number.isFinite(min) && Number.isFinite(max) && max < min) {
      fieldErrors[maxCol] = "Max must be ≥ min.";
    }
  };
  applyRange(TICKET_MIN_COL, TICKET_MAX_COL);
  applyRange(FUNDING_MIN_COL, FUNDING_MAX_COL);

  return { fieldErrors, founderRowErrors };
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
  const [founders, setFounders] = useState<Founder[]>([{ ...EMPTY_FOUNDER }]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [attemptedSave, setAttemptedSave] = useState(false);
  const [gstStatus, setGstStatus] = useState<FieldCheckStatus>("idle");
  const [cinStatus, setCinStatus] = useState<FieldCheckStatus>("idle");
  const verifiedGstRef = useRef<string | null>(null);
  const verifiedCinRef = useRef<string | null>(null);
  const gstRequestIdRef = useRef(0);
  const cinRequestIdRef = useRef(0);

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
      for (const f of toProfileFields(valid.fields)) {
        if (f.columnName === FOUNDERS_COLUMN) continue;
        seeded[f.columnName] = normalizeValue(f);
      }
      const names = new Set(valid.fields.map((f) => f.fieldName));
      if (names.has(TICKET_MIN_COL) || names.has(TICKET_CURRENCY_COL)) {
        if (!seeded[TICKET_CURRENCY_COL]) seeded[TICKET_CURRENCY_COL] = "INR";
      }
      if (names.has(FUNDING_MIN_COL) || names.has(FUNDING_CURRENCY_COL)) {
        if (!seeded[FUNDING_CURRENCY_COL]) seeded[FUNDING_CURRENCY_COL] = "INR";
      }
      setValues(seeded);
      setFounders([{ ...EMPTY_FOUNDER }]);
      setAttemptedSave(false);
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

  const handleFoundersChange = (next: Founder[]) => {
    setFounders(next);
    setErrors((prev) => (prev[FOUNDERS_COLUMN] ? { ...prev, [FOUNDERS_COLUMN]: "" } : prev));
  };

  const gstVal = typeof values[GST_COLUMN] === "string" ? values[GST_COLUMN] : "";
  const cinVal = typeof values[CIN_COLUMN] === "string" ? values[CIN_COLUMN] : "";

  const incomplete = useMemo(
    () => collectIncomplete({ fields, values, founders, gstStatus, cinStatus }),
    [fields, values, founders, gstStatus, cinStatus],
  );
  const remainingLabels = useMemo(() => {
    const labels: string[] = [];
    const seen = new Set<string>();
    for (const f of fields) {
      if (!incomplete.fieldErrors[f.columnName]) continue;
      const label = fieldLabel(f.columnName, f.label);
      if (seen.has(label)) continue;
      seen.add(label);
      labels.push(label);
    }
    if (incomplete.founderRowErrors.some((row) => row?.name || row?.url)) {
      const label = fieldLabel(FOUNDERS_COLUMN, "Founders & LinkedIn");
      if (!seen.has(label)) labels.push(label);
    }
    return labels;
  }, [fields, incomplete]);
  const canSubmit = remainingLabels.length === 0;

  useEffect(() => {
    if (verifiedGstRef.current && verifiedGstRef.current !== gstVal.toUpperCase()) {
      setGstStatus("idle");
    }
  }, [gstVal]);

  useEffect(() => {
    if (verifiedCinRef.current && verifiedCinRef.current !== cinVal.toUpperCase()) {
      setCinStatus("idle");
    }
  }, [cinVal]);

  const handleGstBlur = async (e: FocusEvent<HTMLInputElement>) => {
    const raw = e.target.value.trim().toUpperCase();
    handleChange(GST_COLUMN, raw);
    if (!raw || !GST_REGEX.test(raw)) return;

    const requestId = ++gstRequestIdRef.current;
    setGstStatus("checking");
    try {
      const res = await verifyGst({ gstin: raw });
      if (requestId !== gstRequestIdRef.current) return;
      if (!res.data?.verified) {
        throw { message: res.message ?? ERROR_MESSAGES.GST_VERIFICATION_FAILED } as ApiError;
      }
      verifiedGstRef.current = raw;
      setGstStatus("verified");
      toast.success(res.message ?? SUCCESS_MESSAGES.GST_VERIFIED);
    } catch (err) {
      if (requestId !== gstRequestIdRef.current) return;
      setGstStatus("idle");
      const message = (err as ApiError).message ?? ERROR_MESSAGES.GST_VERIFICATION_FAILED;
      setErrors((prev) => ({ ...prev, [GST_COLUMN]: message }));
      toast.error(message);
    }
  };

  const handleCinBlur = async (e: FocusEvent<HTMLInputElement>) => {
    const raw = e.target.value.trim().toUpperCase();
    handleChange(CIN_COLUMN, raw);
    if (!raw || !CIN_REGEX.test(raw)) return;

    const requestId = ++cinRequestIdRef.current;
    setCinStatus("checking");
    try {
      const res = await verifyCin({ cin: raw });
      if (requestId !== cinRequestIdRef.current) return;
      if (!res.data?.verified) {
        throw { message: res.message ?? ERROR_MESSAGES.CIN_VERIFICATION_FAILED } as ApiError;
      }
      verifiedCinRef.current = raw;
      setCinStatus("verified");
      toast.success(res.message ?? SUCCESS_MESSAGES.CIN_VERIFIED);
    } catch (err) {
      if (requestId !== cinRequestIdRef.current) return;
      setCinStatus("idle");
      const message = (err as ApiError).message ?? ERROR_MESSAGES.CIN_VERIFICATION_FAILED;
      setErrors((prev) => ({ ...prev, [CIN_COLUMN]: message }));
      toast.error(message);
    }
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
    if (!canSubmit) {
      setAttemptedSave(true);
      return;
    }

    setSaving(true);
    try {
      // PUT /users/profile writes `user` columns plus empty company GST/CIN.
      // Other company-owned fields stay locked and are never sent.
      const payload: Record<string, unknown> = {};
      for (const f of fields) {
        if (!f.isEditable || f.columnName === FOUNDERS_COLUMN) continue;
        const value = values[f.columnName];
        if (isBlank(value)) continue;
        const out = toPayloadValue(f.columnName, value);
        if (out !== undefined) payload[f.columnName] = out;
      }
      const foundersField = fields.find((f) => f.columnName === FOUNDERS_COLUMN);
      if (foundersField?.isEditable) {
        const cleaned = normalizeFounders(founders);
        if (cleaned.length > 0) payload[FOUNDERS_COLUMN] = cleaned;
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
      leftover: fields.filter((f) => !placed.has(f.columnName) && !FOLDED_COLUMNS.has(f.columnName)),
    };
  }, [fields]);

  const renderField = (field: SwitchRoleField) => {
    const error = errors[field.columnName] || (attemptedSave ? incomplete.fieldErrors[field.columnName] : undefined);
    const label = fieldLabel(field.columnName, field.label);

    if (field.columnName === FOUNDERS_COLUMN && field.isEditable) {
      return (
        <div key={field.columnName} className="sm:col-span-2">
          <FoundersEditor
            label={label}
            required={field.isRequired === true}
            value={founders}
            onChange={handleFoundersChange}
            error={error}
            rowErrors={attemptedSave ? incomplete.founderRowErrors : []}
          />
        </div>
      );
    }

    if (FIRST_FILL_COMPANY_COLUMNS.has(field.columnName) && field.isEditable) {
      const storedRaw = values[field.columnName];
      const stored = typeof storedRaw === "string" ? storedRaw : "";
      const isGst = field.columnName === GST_COLUMN;
      return (
        <div key={field.columnName}>
          <IdentifierField
            id={`switch-${field.columnName}`}
            label={label}
            required={field.isRequired === true}
            value={stored}
            error={error}
            status={isGst ? gstStatus : cinStatus}
            placeholder={isGst ? "22AAAAA0000A1Z5" : "U12345MH2024PTC123456"}
            onChange={(val) => handleChange(field.columnName, val)}
            onBlur={isGst ? handleGstBlur : handleCinBlur}
          />
        </div>
      );
    }

    // Uploaded document → the same upload control the registration flow uses.
    const docType = DOCUMENT_COLUMNS[field.columnName];
    if (docType) {
      const stored = values[field.columnName];
      return (
        <div key={field.columnName} className="sm:col-span-2">
          <FileUploadField
            id={`switch-${field.columnName}`}
            label={label}
            required={field.isRequired === true}
            optional={field.isRequired === false}
            error={error}
            scanType="document"
            docType={docType}
            value={typeof stored === "string" ? stored : ""}
            onChange={(doc) => handleChange(field.columnName, doc?.s3Key ?? "")}
          />
        </div>
      );
    }

    if (field.columnName === PHOTO_COLUMN) {
      const stored = values[field.columnName];
      return (
        <div key={field.columnName} className="sm:col-span-2">
          <PhotoField
            label={label}
            photoKey={typeof stored === "string" ? stored : ""}
            locked={!field.isEditable}
            editable={field.isEditable}
            required={field.isRequired === true}
            optional={field.isRequired === false}
            onUploaded={(key) => handleChange(PHOTO_COLUMN, key)}
          />
        </div>
      );
    }

    if (field.columnName === TICKET_MIN_COL) {
      return (
        <div key={field.columnName} className="sm:col-span-2">
          <AmountRangeField
            id="switch-ticket-size"
            label="Ticket Size"
            required={field.isRequired === true || fields.some((f) => f.columnName === TICKET_MAX_COL && f.isRequired)}
            locked={!field.isEditable}
            disabled={!field.isEditable}
            currencyValue={stringValue(values, TICKET_CURRENCY_COL)}
            minValue={stringValue(values, TICKET_MIN_COL)}
            maxValue={stringValue(values, TICKET_MAX_COL)}
            minError={error}
            maxError={errors[TICKET_MAX_COL] || (attemptedSave ? incomplete.fieldErrors[TICKET_MAX_COL] : undefined)}
            onCurrencyChange={(v) => handleChange(TICKET_CURRENCY_COL, v)}
            onMinChange={(v) => handleChange(TICKET_MIN_COL, v)}
            onMaxChange={(v) => handleChange(TICKET_MAX_COL, v)}
          />
        </div>
      );
    }

    if (field.columnName === FUNDING_MIN_COL) {
      return (
        <div key={field.columnName} className="sm:col-span-2">
          <AmountRangeField
            id="switch-funding-ask"
            label="Funding Ask Amount"
            required={field.isRequired === true || fields.some((f) => f.columnName === FUNDING_MAX_COL && f.isRequired)}
            locked={!field.isEditable}
            disabled={!field.isEditable}
            currencyValue={stringValue(values, FUNDING_CURRENCY_COL)}
            minValue={stringValue(values, FUNDING_MIN_COL)}
            maxValue={stringValue(values, FUNDING_MAX_COL)}
            minError={error}
            maxError={errors[FUNDING_MAX_COL] || (attemptedSave ? incomplete.fieldErrors[FUNDING_MAX_COL] : undefined)}
            onCurrencyChange={(v) => handleChange(FUNDING_CURRENCY_COL, v)}
            onMinChange={(v) => handleChange(FUNDING_MIN_COL, v)}
            onMaxChange={(v) => handleChange(FUNDING_MAX_COL, v)}
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
            error={error}
            onChange={handleChange}
          />
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
        <div className="flex shrink-0 flex-col gap-3 border-t border-outline-variant/20 bg-surface-container-lowest px-8 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="min-w-0 text-xs text-on-surface-variant">
            {attemptedSave && !canSubmit && (
              <span>
                Fill in to continue:{" "}
                <span className="font-semibold text-error">{remainingLabels.join(", ")}</span>
              </span>
            )}
          </p>
          <div className="flex shrink-0 items-center justify-end gap-3">
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
