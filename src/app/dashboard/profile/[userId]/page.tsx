"use client";

import { Suspense, useCallback, useEffect, useState, type ReactNode } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { AsyncState } from "@/components/ui/AsyncState";
import { Icon } from "@/components/ui/Icon";
import { Loader } from "@/components/common/loader";
import { normalizeRole, type Role } from "@/lib/roles";
import { getUserRoleDetails, type ProfileField } from "@/services/user.service";
import { normalizeValue, PROFILE_SECTIONS } from "@/app/dashboard/profile/page";
import { getFieldOptionConfig } from "@/lib/profile-field-options";
import { ProposalFormModal } from "@/components/dashboard/connections/ProposalFormModal";
import { useSenderIdentity } from "@/components/dashboard/connections/sender-identity";
import type { ApiError } from "@/lib/axios";

/** Fields never rendered — leaked secrets, not profile content. */
const HIDDEN_FIELDS = new Set(["password"]);

/** Columns whose presence identifies the profile's role (mirrors the section
 *  groupings on My Profile — there's no explicit "role" field in this response). */
const ROLE_SIGNAL_COLUMNS: { columns: string[]; role: Role }[] = [
  { columns: ["b2b_sector", "b2b_sub_sector", "b2b_intent"], role: "b2b_enterprise" },
  { columns: ["investor_type", "ticket_size_amt_min", "investor_intent"], role: "investor" },
  { columns: ["funding_stage", "startup_intent", "startup_industry_sector"], role: "startup" },
];

function inferRole(fields: ProfileField[]): Role | null {
  const cols = new Set(fields.map((f) => f.columnName));
  const explicit = fields.find((f) => f.columnName === "role");
  if (explicit) return normalizeRole(typeof explicit.value === "string" ? explicit.value : "");
  return ROLE_SIGNAL_COLUMNS.find((s) => s.columns.some((c) => cols.has(c)))?.role ?? null;
}

function fieldValue(fields: ProfileField[], columnName: string): string {
  const f = fields.find((x) => x.columnName === columnName);
  if (!f) return "";
  return typeof f.value === "string" ? f.value : Array.isArray(f.value) ? f.value.join(", ") : "";
}

/** Columns that hold an uploaded document's S3 key — shown as a provided marker rather
 *  than the raw key. */
const DOCUMENT_COLUMNS = new Set(["incorporation_certificate", "pitch_deck_certificate"]);

/**
 * Plain read-only display for one profile field — label above, value below as text
 * (or chips for multi-select), instead of the input-styled boxes `ProfileFieldRow`
 * renders. Reuses the same value normalization + option-label mapping as My Profile so
 * stored codes read as their human labels.
 */
function ReadOnlyField({ field }: { field: ProfileField }) {
  const label = field.label ?? field.columnName;
  const cfg = getFieldOptionConfig(field.columnName);
  const options = cfg?.options ?? field.options ?? [];
  const labelFor = (v: string) => options.find((o) => o.value === v)?.label ?? v;
  const normalized = normalizeValue(field);

  const dash = <span className="text-sm text-outline-variant">—</span>;
  let body: ReactNode;

  if (Array.isArray(normalized)) {
    const chips = normalized.map(labelFor).filter(Boolean);
    body = chips.length ? (
      <div className="flex flex-wrap gap-1.5">
        {chips.map((c) => (
          <span
            key={c}
            className="rounded-lg bg-secondary-container px-2.5 py-0.5 text-xs font-semibold text-on-secondary-container"
          >
            {c}
          </span>
        ))}
      </div>
    ) : (
      dash
    );
  } else if (DOCUMENT_COLUMNS.has(field.columnName)) {
    body = normalized ? (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-on-surface">
        <Icon name="description" size={16} className="text-primary" />
        Document provided
      </span>
    ) : (
      dash
    );
  } else {
    const text = normalized ? labelFor(normalized) : "";
    body = text ? <p className="break-words text-sm font-medium text-on-surface">{text}</p> : dash;
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="px-0.5 font-label text-xs font-bold uppercase tracking-wide text-on-surface-variant">{label}</span>
      {body}
    </div>
  );
}

/**
 * Read-only profile page for a navbar search result (GET /users/role-details),
 * with a Connect button that opens the existing connection-request flow. Reuses
 * the exact same section grouping + field rendering as My Profile (`PROFILE_SECTIONS`,
 * `ProfileFieldRow` disabled), just without the edit toggle/save footer.
 * `useSearchParams` requires a Suspense boundary — see UserProfilePage below.
 */
function UserProfilePageContent() {
  const router = useRouter();
  const params = useParams<{ userId: string }>();
  const searchParams = useSearchParams();
  const roleId = Number(searchParams.get("roleId"));
  const companyId = Number(searchParams.get("companyId"));
  const userId = Number(params.userId);

  const [fields, setFields] = useState<ProfileField[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [proposalOpen, setProposalOpen] = useState(false);
  const { sender } = useSenderIdentity();

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getUserRoleDetails({ userId, roleId, companyId })
      .then(setFields)
      .catch((err) => setError((err as ApiError).message ?? "Couldn't load this profile. Please try again."))
      .finally(() => setLoading(false));
  }, [userId, roleId, companyId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load() drives loading state
    load();
  }, [load]);

  // De-dupe (the API returns some columns twice) and drop secrets.
  const visibleFields: ProfileField[] = [];
  const seen = new Set<string>();
  for (const f of fields ?? []) {
    if (HIDDEN_FIELDS.has(f.columnName) || seen.has(f.columnName)) continue;
    seen.add(f.columnName);
    visibleFields.push(f);
  }

  const fieldByColumn = new Map(visibleFields.map((f) => [f.columnName, f]));
  const sectionColumns = new Set(PROFILE_SECTIONS.flatMap((s) => s.columns));
  const leftoverFields = visibleFields.filter((f) => !sectionColumns.has(f.columnName));

  const name = [fieldValue(visibleFields, "first_name"), fieldValue(visibleFields, "last_name")]
    .filter(Boolean)
    .join(" ")
    .trim();
  const company = fieldValue(visibleFields, "organization_name") || fieldValue(visibleFields, "company_name");

  const renderField = (field: ProfileField) => {
    const fullWidth = field.type === "textarea" || field.type === "array";
    return (
      <div key={field.columnName} className={fullWidth ? "sm:col-span-2" : ""}>
        <ReadOnlyField field={field} />
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col">
      {/* ── Page Header — mirrors My Profile's header ── */}
      <div className="flex shrink-0 items-center gap-3 border-b border-outline-variant/20 bg-surface-container-lowest px-8 py-5">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Back"
          className="flex size-9 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
        >
          <Icon name="arrow_back" size={20} />
        </button>
        <div className="flex size-11 items-center justify-center rounded-2xl bg-primary-container text-on-primary-container">
          <Icon name="account_circle" size={24} />
        </div>
        <div className="min-w-0">
          <h1 className="truncate font-headline text-xl font-bold text-on-surface">{name || "Profile"}</h1>
          <p className="truncate text-xs text-on-surface-variant">{company || "View-only profile"}</p>
        </div>
      </div>

      {/* ── Body — same section grouping as My Profile ── */}
      <div className="thin-scrollbar flex-1 overflow-y-auto px-8 py-7">
        <AsyncState
          loading={loading}
          error={error}
          onRetry={load}
          isEmpty={!loading && !error && visibleFields.length === 0}
          emptyIcon="person_off"
          emptyText="No profile data found."
        >
          <div className="mx-auto max-w-4xl">
            <div className="flex flex-col gap-8">
              {PROFILE_SECTIONS.map((section) => {
                const present = section.columns
                  .map((col) => fieldByColumn.get(col))
                  .filter((f): f is ProfileField => Boolean(f));
                if (present.length === 0) return null;
                return (
                  <section key={section.title} className="flex flex-col gap-4">
                    <h3 className="border-b border-outline-variant/20 pb-2 font-headline text-sm font-bold uppercase tracking-wide text-on-surface">
                      {section.title}
                    </h3>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">{present.map(renderField)}</div>
                  </section>
                );
              })}

              {leftoverFields.length > 0 && (
                <section className="flex flex-col gap-4">
                  <h3 className="border-b border-outline-variant/20 pb-2 font-headline text-sm font-bold uppercase tracking-wide text-on-surface">
                    Additional Information
                  </h3>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">{leftoverFields.map(renderField)}</div>
                </section>
              )}
            </div>
          </div>
        </AsyncState>
      </div>

      {/* ── Footer — Connect (in place of My Profile's Save/Discard) ── */}
      {!loading && !error && visibleFields.length > 0 && (
        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-outline-variant/20 bg-surface-container-lowest px-8 py-4">
          <button
            type="button"
            onClick={() => setProposalOpen(true)}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-6 font-bold text-on-primary transition-colors hover:bg-primary-dim"
          >
            <Icon name="person_add" size={18} />
            Connect
          </button>
        </div>
      )}

      {fields && (
        <ProposalFormModal
          open={proposalOpen}
          onClose={() => setProposalOpen(false)}
          recipient={{ id: userId, roleId, companyId, name, company, role: inferRole(visibleFields) }}
          sender={sender}
          onSent={() => setProposalOpen(false)}
        />
      )}
    </div>
  );
}

export default function UserProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Loader size="large" />
        </div>
      }
    >
      <UserProfilePageContent />
    </Suspense>
  );
}
