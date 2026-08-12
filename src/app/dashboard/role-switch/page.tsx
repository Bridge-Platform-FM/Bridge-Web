"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/Textarea";
import { AsyncState } from "@/components/ui/AsyncState";
import { Modal } from "@/components/modal/Modal";
import { Loader } from "@/components/common/loader";
import { useAuth } from "@/components/auth/AuthProvider";
import { KYC_REVIEW_STATUS_META, StatusPill } from "@/components/dashboard/kyc-status";
import { fetchSwitchedRoleUsers, reviewRoleSwitch } from "@/services/admin.service";
import { initials, formatDate, roleLabel } from "@/lib/admin-format";
import { isStaffRole } from "@/lib/roles";
import type { KycReviewStatus, RoleSwitchRequest } from "@/types/api.types";
import type { ApiError } from "@/lib/axios";

const TABS: { value: "all" | Lowercase<KycReviewStatus>; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];
type Tab = (typeof TABS)[number]["value"];

/**
 * Role Switch review (admin / super_admin) — the queue of extra roles users have added
 * to their account. The backend lists one row per role for every user holding more than
 * one, so a user appears once per role: their original (`is_default_role`) plus each
 * added role awaiting a decision.
 *
 * Deliberately the same shape as KYC Review (tabs → search → list Card → status pill),
 * and it reuses that page's `StatusPill` + `KYC_REVIEW_STATUS_META` because the backend
 * writes the same Pending/Approved/Rejected values for both flows. Approve/reject happen
 * inline on the row rather than in a drawer — there is nothing else to inspect.
 */
export default function RoleSwitchReviewPage() {
  const router = useRouter();
  const { role, isLoaded } = useAuth();

  const [tab, setTab] = useState<Tab>("pending");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<RoleSwitchRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** companyUserRoleId currently being submitted, so only that row shows a spinner. */
  const [submitting, setSubmitting] = useState<number | null>(null);
  /** Row awaiting a rejection reason; null = the reject dialog is closed. */
  const [rejecting, setRejecting] = useState<RoleSwitchRequest | null>(null);
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (isLoaded && !isStaffRole(role)) router.replace("/dashboard");
  }, [isLoaded, role, router]);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchSwitchedRoleUsers()
      .then(setItems)
      .catch((err: ApiError) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load() sets loading; runs once on mount
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      // The original role isn't a switch request — it has nothing to review.
      if (item.isDefaultRole) return false;
      if (tab !== "all" && item.status !== (tab.toUpperCase() as KycReviewStatus)) return false;
      if (!q) return true;
      return (
        item.userName.toLowerCase().includes(q) ||
        (item.email ?? "").toLowerCase().includes(q) ||
        (item.companyName ?? "").toLowerCase().includes(q) ||
        item.roleCode.toLowerCase().includes(q)
      );
    });
  }, [items, tab, search]);

  const submit = async (item: RoleSwitchRequest, action: "approve" | "reject", rejectionReason?: string) => {
    setSubmitting(item.companyUserRoleId);
    try {
      await reviewRoleSwitch(item.companyUserRoleId, action, rejectionReason);
      toast.success(`${roleLabel(item.roleCode)} role ${action === "approve" ? "approved" : "rejected"} for ${item.userName}.`);
      setRejecting(null);
      setReason("");
      load();
    } catch (err) {
      toast.error((err as ApiError).message ?? "Couldn't update the role switch. Please try again.");
    } finally {
      setSubmitting(null);
    }
  };

  if (!isLoaded || !isStaffRole(role)) return null;

  return (
    <div className="mx-auto max-w-6xl p-6 md:p-8">
      {/* Header */}
      <div className="mb-5">
        <h1 className="font-headline text-2xl font-extrabold tracking-[-0.02em] text-on-surface md:text-3xl">
          Role Switch
        </h1>
        <p className="mt-1 text-on-surface-variant">Review roles users have added to their account.</p>
      </div>

      {/* Tabs + search */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-xl bg-surface-container-high p-1">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                tab === t.value
                  ? "bg-surface-container-lowest text-on-surface shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="w-full sm:w-64">
          <Input
            placeholder="Search requests…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            adornment={<Icon name="search" size={18} />}
          />
        </div>
      </div>

      {/* List */}
      <Card surface="lowest" padding="none" className="overflow-hidden">
        <AsyncState
          loading={loading}
          error={error}
          onRetry={load}
          isEmpty={filtered.length === 0}
          emptyIcon="swap_horiz"
          emptyText="No role switch requests in this tab."
        >
          <ul className="divide-y divide-outline/5">
            {filtered.map((item) => {
              const busy = submitting === item.companyUserRoleId;
              const isPending = item.status === "PENDING";
              return (
                <li key={item.companyUserRoleId} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-container text-sm font-bold text-on-primary-container">
                    {initials(item.userName)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-on-surface">{item.userName}</p>
                    <p className="truncate text-xs text-on-surface-variant">{item.email}</p>
                  </div>

                  <div className="hidden min-w-0 flex-1 text-sm text-on-surface md:block">
                    <p className="truncate">{item.companyName ?? "—"}</p>
                  </div>

                  {/* The role being added, plus whether its extra profile fields are done */}
                  <div className="hidden shrink-0 text-right sm:block">
                    <p className="text-sm font-semibold text-on-surface">{roleLabel(item.roleCode)}</p>
                    <p className="text-xs text-on-surface-variant">
                      {item.isProfileCompleted ? "Profile completed" : "Profile incomplete"}
                    </p>
                  </div>

                  <div className="hidden shrink-0 text-xs text-on-surface-variant lg:block">
                    {item.switchedAt ? `Added ${formatDate(item.switchedAt)}` : ""}
                  </div>

                  <StatusPill {...KYC_REVIEW_STATUS_META[item.status]} />

                  {/* Actions — only a pending row can still be decided. */}
                  <div className="flex shrink-0 items-center gap-1">
                    {isPending ? (
                      <>
                        <button
                          type="button"
                          onClick={() => submit(item, "approve")}
                          disabled={busy}
                          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-bold text-primary transition-colors hover:bg-primary-container/40 disabled:opacity-50"
                        >
                          {busy ? <Loader size={16} /> : <Icon name="task_alt" size={18} />}
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setReason("");
                            setRejecting(item);
                          }}
                          disabled={busy}
                          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-bold text-error transition-colors hover:bg-error/10 disabled:opacity-50"
                        >
                          <Icon name="cancel" size={18} />
                          Reject
                        </button>
                      </>
                    ) : item.status === "REJECTED" && item.rejectionReason ? (
                      <span
                        title={item.rejectionReason}
                        className="max-w-[180px] truncate text-xs text-on-surface-variant"
                      >
                        {item.rejectionReason}
                      </span>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </AsyncState>
      </Card>

      {/* Rejection reason — required by the backend when rejecting. */}
      <Modal
        open={rejecting != null}
        onClose={() => setRejecting(null)}
        title="Reject role switch"
        maxWidthClass="max-w-md"
        footer={
          <div className="flex w-full justify-end gap-2">
            <button
              type="button"
              onClick={() => setRejecting(null)}
              className="flex h-11 items-center rounded-xl bg-surface-container-high px-4 text-sm font-bold text-on-surface transition-colors hover:bg-surface-container-highest"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => rejecting && submit(rejecting, "reject", reason.trim())}
              disabled={!reason.trim() || submitting != null}
              className="flex h-11 items-center gap-2 rounded-xl border border-error/40 px-4 text-sm font-bold text-error transition-colors hover:bg-error/10 disabled:opacity-50"
            >
              {submitting != null ? <Loader size={16} /> : <Icon name="cancel" size={18} />}
              Reject
            </button>
          </div>
        }
      >
        <p className="mb-3 text-sm text-on-surface-variant">
          Rejecting the <strong className="text-on-surface">{rejecting ? roleLabel(rejecting.roleCode) : ""}</strong>{" "}
          role for <strong className="text-on-surface">{rejecting?.userName}</strong>. The reason is shown to the user.
        </p>
        <Textarea
          id="role-switch-rejection-reason"
          label="Reason for rejection"
          required
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Explain what needs to change before this role can be approved."
        />
      </Modal>
    </div>
  );
}
