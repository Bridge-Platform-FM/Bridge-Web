"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Icon } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { ToggleSwitch } from "@/components/ui/ToggleSwitch";
import { Loader } from "@/components/common/loader";
import { getUserProfile, saveUserProfile, type ProfileField } from "@/services/user.service";
import {
  getFieldOptionConfig,
  TEXTAREA_COLUMNS,
  NUMBER_COLUMNS,
  FUNDING_CURRENCY_COL,
  FUNDING_MIN_COL,
  FUNDING_MAX_COL,
} from "@/lib/profile-field-options";
import { CURRENCIES } from "@/lib/startup-profile-options";
import { DIAL_CODES, continentForCountry } from "@/lib/countries";
import { DocumentPreviewModal } from "@/components/onboarding/DocumentPreviewModal";
import { profilePhotoKey } from "@/lib/useMyProfilePhoto";
import type { ApiError } from "@/lib/axios";

/** Columns that hold an uploaded document's S3 key (rendered with a Preview button). */
const DOCUMENT_COLUMNS = new Set(["incorporation_certificate", "pitch_deck_certificate"]);

/** Profile columns handled by the combined phone widget (rendered together). */
const PHONE_NUMBER_COL = "mobile_number";
const PHONE_CODE_COL = "country_code";

/**
 * Field grouping + order, mirroring the registration complete-profile flow so the
 * profile reads the same way. Each section lists its columns in display order;
 * only the columns the API actually returns are shown (so role-specific sections
 * appear only for that role). Columns not listed anywhere fall into a trailing
 * "Additional Information" section. Folded columns (`country_code`,
 * `funding_currency`, `funding_ask_amt_max`) are intentionally omitted — they're
 * rendered inside the phone / funding widgets at their anchor column.
 */
export const PROFILE_SECTIONS: { title: string; columns: string[] }[] = [
  {
    title: "Account Details",
    columns: ["organization_name", "role", "company_email", "mobile_number", "gst_number", "cin_number"],
  },
  {
    title: "Personal Info",
    columns: ["first_name", "last_name", "country", "continent"],
  },
  {
    title: "Primary Sector",
    columns: ["primary_sector"],
  },
  {
    title: "Startup Details",
    columns: [
      "startup_industry_sector",
      "funding_stage",
      "team_size_min",
      "team_size_max",
      "funding_ask_amt_min",
      "use_of_funds",
      "business_description",
      "startup_intent",
      "incorporation_certificate",
      "pitch_deck_certificate",
    ],
  },
  {
    title: "Investment Profile",
    columns: [
      "investor_sector_preference",
      "prefrerred_investment_stage",
      "ticket_size_amt_min",
      "ticket_size_amt_max",
      "geographic_investment_preference",
      "investor_type",
      "investor_intent",
      "investor_portfolio_overview",
      "number_of_investments_to_date",
    ],
  },
  {
    title: "Business Profile",
    columns: [
      "b2b_sector",
      "b2b_sub_sector",
      "industry_vertical",
      "business_type",
      "min_order_quantity",
      "revenue_band",
      "years_in_operation",
      "export_rediness",
      "b2b_intent",
      "products_ervice_Offered",
      "business_requirements",
    ],
  },
  {
    title: "Links",
    columns: ["company_website_url", "linkedin_profile_url"],
  },
  {
    title: "About",
    columns: ["short_bio"],
  },
];

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Coerce any stored value into a string[] (parses JSON / comma-joined strings). */
function toArrayValue(value: string | string[]): string[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch { /* noop */ }
    return value.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

/** Coerce any stored value into a single string (joins arrays for display). */
function toStringValue(value: string | string[]): string {
  return Array.isArray(value) ? value.join(", ") : value ?? "";
}

/**
 * Normalize a field's API value into the shape the UI control expects. A field is
 * multi-select when its API `type` is "array" OR the registration registry says
 * so (so the choice list stays in sync with the registration flow).
 *
 * Exported so other read-only views (e.g. the navbar-search profile page) can
 * reuse the exact same field rendering as My Profile.
 */
export function normalizeValue(field: ProfileField): string | string[] {
  const cfg = getFieldOptionConfig(field.columnName);
  const isMulti = field.type === "array" || cfg?.multiple === true;
  return isMulti ? toArrayValue(field.value) : toStringValue(field.value);
}

/** "" / non-numeric → undefined; otherwise the parsed number. */
function toNumber(v: string): number | undefined {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : undefined;
}

/** Value-equality for field values (order-insensitive for multi-select arrays). */
function valuesEqual(a: string | string[], b: string | string[]): boolean {
  if (Array.isArray(a) || Array.isArray(b)) {
    const x = [...toArrayValue(a)].sort();
    const y = [...toArrayValue(b)].sort();
    return x.length === y.length && x.every((v, i) => v === y[i]);
  }
  return toStringValue(a) === toStringValue(b);
}

/**
 * Build the PUT-profile payload with ONLY the columns the user actually changed
 * (current value differs from the fetched value). Keys are the backend `user`
 * columns (the API's own `columnName`s) — the same snake_case keys registration
 * sends. Numeric columns are coerced to numbers; a changed-but-blank number is
 * skipped (can't be sent as a number).
 */
function buildPayload(
  fields: ProfileField[],
  localValues: Record<string, string | string[]>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    const col = f.columnName;
    const original = normalizeValue(f);
    const current = localValues[col] ?? original;

    // Send only changed columns.
    if (valuesEqual(current, original)) continue;

    if (NUMBER_COLUMNS.has(col)) {
      const n = typeof current === "string" ? toNumber(current) : undefined;
      if (n === undefined) continue; // changed to blank/invalid → can't send as a number
      out[col] = n;
    } else {
      // Strings/arrays sent as-is — including an intentional clear ("" / []).
      out[col] = current;
    }
  }
  return out;
}

// ─── individual field ─────────────────────────────────────────────────────────

interface FieldProps {
  field: ProfileField;
  value: string | string[];
  editMode: boolean;
  onChange: (col: string, val: string | string[]) => void;
}

/** Shared label row (with optional lock icon) for the select-style fields. */
function FieldLabel({ id, label, locked }: { id: string; label: string; locked: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <label
        htmlFor={id}
        className="px-1 font-label text-xs font-bold uppercase tracking-wide text-on-surface-variant"
      >
        {label}
      </label>
      {locked && <Icon name="lock" size={13} className="text-outline-variant" />}
    </div>
  );
}

/**
 * Combined Country-Code + Mobile-Number control — mirrors the company
 * registration "Contact Number" widget (dial-code Select + tel input in one
 * bordered row). Used in place of two separate `country_code` / `mobile_number`
 * fields so My Profile matches the registration UI.
 */
function PhoneField({
  label,
  codeValue,
  numberValue,
  disabled,
  locked,
  onCodeChange,
  onNumberChange,
}: {
  label: string;
  codeValue: string;
  numberValue: string;
  disabled: boolean;
  locked: boolean;
  onCodeChange: (val: string) => void;
  onNumberChange: (val: string) => void;
}) {
  if (disabled) {
    return (
      <div className="flex flex-col gap-2">
        <FieldLabel id="profile-field-mobile_number" label={label} locked={locked} />
        <div className="flex min-h-10 items-center gap-2 rounded-lg border border-outline-variant/30 bg-surface-container-low px-3.5 py-2 text-sm text-on-surface">
          {numberValue ? (
            <>
              <span className="font-medium text-on-surface-variant">{codeValue || "+91"}</span>
              <span>{numberValue}</span>
            </>
          ) : (
            <span className="text-outline-variant">—</span>
          )}
          <Icon name="smartphone" size={16} className="ml-auto text-on-surface-variant" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <FieldLabel id="profile-field-mobile_number" label={label} locked={locked} />
      <div className="relative flex h-10 w-full items-center rounded-lg border border-outline-variant/30 bg-surface-container-low transition-all duration-200 focus-within:border-primary focus-within:bg-surface-container-lowest focus-within:ring-2 focus-within:ring-primary/10">
        <div className="w-[4.8rem] shrink-0">
          <Select
            aria-label="Country code"
            searchable
            placeholder="Code"
            options={DIAL_CODES}
            value={codeValue || "+91"}
            onChange={onCodeChange}
            className="flex h-10 w-full cursor-pointer items-center justify-between gap-1 bg-transparent px-3 text-left text-sm text-on-surface outline-none hover:opacity-85"
            panelClassName="w-72 md:w-80"
            displayValueOnly
          />
        </div>
        <div className="h-5 w-px shrink-0 bg-outline-variant/30" />
        <input
          id="profile-field-mobile_number"
          type="tel"
          placeholder="9632585698"
          value={numberValue}
          onChange={(e) => onNumberChange(e.target.value)}
          className="h-full flex-1 bg-transparent px-3 text-sm text-on-surface outline-none placeholder:text-outline-variant"
        />
        <div className="flex shrink-0 items-center pr-3 text-on-surface-variant">
          <Icon name="smartphone" size={18} />
        </div>
      </div>
    </div>
  );
}

/**
 * Startup "Funding Ask Amount" group — currency + min + max on one row, mirroring
 * the registration complete-profile widget. Folds the three columns
 * (`funding_currency`, `funding_ask_amt_min`, `funding_ask_amt_max`) into one.
 */
function FundingAmountField({
  label,
  currencyValue,
  minValue,
  maxValue,
  disabled,
  locked,
  onCurrencyChange,
  onMinChange,
  onMaxChange,
}: {
  label: string;
  currencyValue: string;
  minValue: string;
  maxValue: string;
  disabled: boolean;
  locked: boolean;
  onCurrencyChange: (val: string) => void;
  onMinChange: (val: string) => void;
  onMaxChange: (val: string) => void;
}) {
  const currencyLabel = CURRENCIES.find((c) => c.value === currencyValue)?.label ?? currencyValue;

  return (
    <div className="flex flex-col gap-2">
      <FieldLabel id="profile-field-funding_ask" label={label} locked={locked} />
      {disabled ? (
        <div className="flex min-h-10 items-center gap-2 rounded-lg border border-outline-variant/30 bg-surface-container-low px-3.5 py-2 text-sm text-on-surface">
          {minValue || maxValue ? (
            <>
              {currencyLabel && (
                <span className="font-medium text-on-surface-variant">{currencyLabel}</span>
              )}
              <span>{minValue || "—"} – {maxValue || "—"}</span>
            </>
          ) : (
            <span className="text-outline-variant">—</span>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[8rem_1fr_1fr]">
          <Select
            aria-label="Currency"
            options={CURRENCIES}
            value={currencyValue || "INR"}
            onChange={onCurrencyChange}
          />
          <Input
            type="number"
            min={0}
            placeholder="Min"
            value={minValue}
            onChange={(e) => onMinChange(e.target.value)}
          />
          <Input
            type="number"
            min={0}
            placeholder="Max"
            value={maxValue}
            onChange={(e) => onMaxChange(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Uploaded-document row — shows whether a file is present and a Preview button
 * that opens the shared `DocumentPreviewModal` for the stored S3 key.
 */
function DocumentField({
  label,
  s3Key,
  locked,
  onPreview,
}: {
  label: string;
  s3Key: string;
  locked: boolean;
  onPreview: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel id={`profile-field-${label}`} label={label} locked={locked} />
      <div className="flex min-h-10 items-center justify-between gap-2 rounded-lg border border-outline-variant/30 bg-surface-container-low px-3.5 py-2">
        {s3Key ? (
          <span className="flex min-w-0 items-center gap-2 text-sm text-on-surface">
            <Icon name="description" size={16} className="shrink-0 text-primary" />
            <span className="truncate">Document uploaded</span>
          </span>
        ) : (
          <span className="text-sm text-outline-variant">Not uploaded</span>
        )}
        {s3Key && (
          <button
            type="button"
            onClick={onPreview}
            className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-semibold text-primary transition-colors hover:bg-primary-container/40"
          >
            <Icon name="visibility" size={16} />
            Preview
          </button>
        )}
      </div>
    </div>
  );
}

/** Exported so read-only profile views (navbar search result page) can reuse it. */
export function ProfileFieldRow({ field, value, editMode, onChange }: FieldProps) {
  const id = `profile-field-${field.columnName}`;
  const locked = !field.isEditable;
  const disabled = !editMode || locked;
  const label = field.label ?? field.columnName;

  // Full registration option list for this column (Primary Sector, Country,
  // dial code, …). Falls back to the API-supplied options when not registered.
  const cfg = getFieldOptionConfig(field.columnName);
  const options = cfg?.options ?? field.options ?? [];
  const isMulti = cfg?.multiple ?? field.type === "array";

  // ── single-select dropdown (registry-backed: country, funding stage, …) ──
  if (cfg && !cfg.multiple) {
    const selected = toStringValue(value);
    const selectedLabel = options.find((o) => o.value === selected)?.label ?? selected;

    return (
      <div className="flex flex-col gap-2">
        <FieldLabel id={id} label={label} locked={locked} />
        {disabled ? (
          <div className="flex min-h-10 items-center rounded-lg border border-outline-variant/30 bg-surface-container-low px-3.5 py-2 text-sm text-on-surface">
            {selectedLabel || <span className="text-outline-variant">—</span>}
          </div>
        ) : (
          <Select
            id={id}
            options={options}
            value={selected}
            searchable={cfg.searchable}
            placeholder={`Select ${label.toLowerCase()}`}
            onChange={(val) => onChange(field.columnName, val)}
          />
        )}
      </div>
    );
  }

  // ── multi-select (API `type: "array"` or registry-backed multi) ──
  if (isMulti) {
    const selected = toArrayValue(value);

    return (
      <div className="flex flex-col gap-2">
        <FieldLabel id={id} label={label} locked={locked} />

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
            searchable={cfg?.searchable}
            placeholder={`Select ${label.toLowerCase()}`}
            onChange={(val) => onChange(field.columnName, val)}
          />
        )}
      </div>
    );
  }

  // ── textarea ── (API `type: "textarea"` OR a known registration textarea column)
  if (field.type === "textarea" || TEXTAREA_COLUMNS.has(field.columnName)) {
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

  // ── all other types → Input (number columns forced to a numeric input) ──
  const htmlType =
    field.type === "number" || NUMBER_COLUMNS.has(field.columnName) ? "number"
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
  // Document being previewed in the shared modal ({ s3Key, title }); null = closed.
  const [preview, setPreview] = useState<{ s3Key: string; title: string } | null>(null);

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

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const handleChange = (col: string, val: string | string[]) => {
    setLocalValues((prev) => {
      const next = { ...prev, [col]: val };
      // Country → Continent cascade, same as the registration complete-profile
      // step: picking a country auto-fills its continent.
      if (col === "country" && typeof val === "string") {
        const continent = continentForCountry(val);
        if (continent) next.continent = continent;
      }
      return next;
    });
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

  // Whether the API returned the digits column, so the dial-code column can be
  // folded into the combined phone widget instead of rendered on its own.
  const hasPhoneNumber = fields.some((f) => f.columnName === PHONE_NUMBER_COL);
  // Whether the funding-min column is present, so currency + max fold into the
  // single "Funding Ask Amount" widget.
  const hasFundingMin = fields.some((f) => f.columnName === FUNDING_MIN_COL);

  // Render one field as the right control (combined widgets for phone / funding,
  // otherwise the generic row), wrapped with the correct column span.
  const renderField = (field: ProfileField) => {
    // Uploaded document → presence + Preview button (opens the shared modal).
    if (DOCUMENT_COLUMNS.has(field.columnName)) {
      const s3Key = toStringValue(localValues[field.columnName] ?? normalizeValue(field));
      const label = field.label ?? field.columnName;
      return (
        <div key={field.columnName}>
          <DocumentField
            label={label}
            s3Key={s3Key}
            locked={!field.isEditable}
            onPreview={() => setPreview({ s3Key, title: label })}
          />
        </div>
      );
    }

    // Combined "Funding Ask Amount" (currency + min + max) widget.
    if (field.columnName === FUNDING_MIN_COL) {
      return (
        <div key={field.columnName} className="sm:col-span-2">
          <FundingAmountField
            label="Funding Ask Amount"
            locked={!field.isEditable}
            disabled={!editMode || !field.isEditable}
            currencyValue={toStringValue(localValues[FUNDING_CURRENCY_COL] ?? "")}
            minValue={toStringValue(localValues[FUNDING_MIN_COL] ?? normalizeValue(field))}
            maxValue={toStringValue(localValues[FUNDING_MAX_COL] ?? "")}
            onCurrencyChange={(v) => handleChange(FUNDING_CURRENCY_COL, v)}
            onMinChange={(v) => handleChange(FUNDING_MIN_COL, v)}
            onMaxChange={(v) => handleChange(FUNDING_MAX_COL, v)}
          />
        </div>
      );
    }

    // Combined Country-Code + Mobile-Number widget (registration style).
    if (field.columnName === PHONE_NUMBER_COL) {
      return (
        <div key={field.columnName}>
          <PhoneField
            label={field.label ?? "Contact Number"}
            locked={!field.isEditable}
            disabled={!editMode || !field.isEditable}
            codeValue={toStringValue(localValues[PHONE_CODE_COL] ?? "")}
            numberValue={toStringValue(localValues[PHONE_NUMBER_COL] ?? normalizeValue(field))}
            onCodeChange={(v) => handleChange(PHONE_CODE_COL, v)}
            onNumberChange={(v) => handleChange(PHONE_NUMBER_COL, v)}
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
        <ProfileFieldRow
          field={field}
          value={localValues[field.columnName] ?? normalizeValue(field)}
          editMode={editMode}
          onChange={handleChange}
        />
      </div>
    );
  };

  // Look up fields by column, and track which columns are folded into a widget
  // (so they aren't double-rendered or pushed into the trailing section).
  const fieldByColumn = new Map(fields.map((f) => [f.columnName, f]));
  const foldedColumns = new Set<string>([
    ...(hasPhoneNumber ? [PHONE_CODE_COL] : []),
    ...(hasFundingMin ? [FUNDING_CURRENCY_COL, FUNDING_MAX_COL] : []),
  ]);
  const sectionColumns = new Set(PROFILE_SECTIONS.flatMap((s) => s.columns));
  // Any returned field not placed in a section (and not folded) — shown last so
  // nothing silently disappears if the backend adds a new column.
  const leftoverFields = fields.filter(
    (f) => !sectionColumns.has(f.columnName) && !foldedColumns.has(f.columnName),
  );

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      // Backend-shaped payload (snake_case `user` columns, same keys as
      // registration's build-profile) — only the changed columns — sent via
      // PUT /users/profile.
      const payload = buildPayload(fields, localValues);
      if (Object.keys(payload).length === 0) {
        toast.info("No changes to save.");
        setEditMode(false);
        return;
      }
      const res = await saveUserProfile(payload);
      toast.success(res.message ?? "Profile saved successfully!");
      // Reflect the saved values back into `fields` so a later "Discard" resets to
      // the latest saved state (not the stale fetched one).
      setFields((prev) =>
        prev.map((f) => ({ ...f, value: localValues[f.columnName] ?? normalizeValue(f) })),
      );
      setEditMode(false);
    } catch (err) {
      const e = err as ApiError;
      // Surface the first backend field-validation error if present, else the message.
      const fieldErrs = (e.data as { data?: { field: string; message: string }[] } | undefined)?.data;
      toast.error(fieldErrs?.[0]?.message ?? e.message ?? "Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* ── Page Header ── */}
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-outline-variant/20 bg-surface-container-lowest px-8 py-5">
        <div className="flex items-center gap-3">
          <Avatar
            photoKey={profilePhotoKey(fields)}
            alt="My profile picture"
            className="size-11 shrink-0 rounded-2xl"
          >
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary-container text-on-primary-container">
              <Icon name="account_circle" size={24} />
            </div>
          </Avatar>
          <div>
            <h1 className="font-headline text-xl font-bold text-on-surface">My Profile</h1>
            <p className="text-xs text-on-surface-variant">View and manage your profile details</p>
          </div>
        </div>

        {/* Edit toggle in top-right */}
        {!loading && fields.length > 0 && (
          <ToggleSwitch
            id="profile-edit-toggle"
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

            <div className="flex flex-col gap-8">
              {PROFILE_SECTIONS.map((section) => {
                // Columns this section owns that the API actually returned, in order.
                const present = section.columns
                  .map((col) => fieldByColumn.get(col))
                  .filter((f): f is ProfileField => Boolean(f));
                if (present.length === 0) return null;
                return (
                  <section key={section.title} className="flex flex-col gap-4">
                    <h3 className="border-b border-outline-variant/20 pb-2 font-headline text-sm font-bold uppercase tracking-wide text-on-surface">
                      {section.title}
                    </h3>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      {present.map(renderField)}
                    </div>
                  </section>
                );
              })}

              {/* {leftoverFields.length > 0 && (
                <section className="flex flex-col gap-4">
                  <h3 className="border-b border-outline-variant/20 pb-2 font-headline text-sm font-bold uppercase tracking-wide text-on-surface">
                    Additional Information
                  </h3>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    {leftoverFields.map(renderField)}
                  </div>
                </section>
              )} */}
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

      {/* Document preview (Incorporation Certificate / Pitch Deck) */}
      <DocumentPreviewModal
        s3Key={preview?.s3Key ?? null}
        title={preview?.title}
        onClose={() => setPreview(null)}
      />
    </div>
  );
}