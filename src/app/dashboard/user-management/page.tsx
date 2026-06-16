"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/Select";
import { AsyncState } from "@/components/ui/AsyncState";
import { useAuth } from "@/components/auth/AuthProvider";
import { UserDetailDrawer } from "@/components/dashboard/UserDetailDrawer";
import { KYC_STATUS_META, StatusPill } from "@/components/dashboard/kyc-status";
import { fetchUsers } from "@/services/admin.service";
import { initials } from "@/lib/admin-format";
import { isStaffRole, ROLE_META } from "@/lib/roles";
import type { AdminUserListItem } from "@/types/api.types";
import type { ApiError } from "@/lib/axios";

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "VERIFIED", label: "KYC Verified" },
  { value: "PENDING", label: "KYC Pending" },
];

export default function UserManagementPage() {
  const router = useRouter();
  const { role, isLoaded } = useAuth();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AdminUserListItem | null>(null);

  // Staff-only — covers direct URL access (sidebar already hides for others).
  useEffect(() => {
    if (isLoaded && !isStaffRole(role)) router.replace("/dashboard");
  }, [isLoaded, role, router]);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchUsers()
      .then((res) => setUsers(res.data))
      .catch((err: ApiError) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load() sets loading; runs once on mount
    load();
  }, [load]);

  // The backend returns the whole list (no pagination), so filter + page here.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (statusFilter && u.kycStatus !== statusFilter) return false;
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.companyName ?? "").toLowerCase().includes(q) ||
        (u.mobileNumber ?? "").includes(q)
      );
    });
  }, [users, search, statusFilter]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const rangeStart = total === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, total);

  const onSearch = (v: string) => {
    setSearch(v);
    setPage(1);
  };
  const onStatus = (v: string) => {
    setStatusFilter(v);
    setPage(1);
  };

  if (!isLoaded || !isStaffRole(role)) return null;

  return (
    <div className="mx-auto max-w-6xl p-6 md:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-headline text-2xl font-extrabold tracking-[-0.02em] text-on-surface md:text-3xl">
          User Management
        </h1>
        <p className="mt-1 text-on-surface-variant">Oversee and manage your growing ecosystem of users.</p>
      </div>

      {/* Filters */}
      <Card surface="lowest" padding="sm" className="mb-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
          <Input
            placeholder="Search by name, email, company, phone…"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            adornment={<Icon name="search" size={18} />}
          />
          <div className="sm:w-52">
            <Select aria-label="KYC status" options={STATUS_OPTIONS} value={statusFilter} onChange={onStatus} placeholder="All Statuses" />
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card surface="lowest" padding="none" className="overflow-hidden">
        <AsyncState
          loading={loading}
          error={error}
          onRetry={load}
          isEmpty={total === 0}
          emptyIcon="group_off"
          emptyText="No users match these filters."
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="border-b border-outline/10">
                  {["User", "Company", "Phone", "Email", "KYC Status", ""].map((h, i) => (
                    <th key={i} className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((u) => (
                  <tr key={u.id} className="border-b border-outline/5 transition-colors last:border-0 hover:bg-surface-container-low">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-container text-sm font-bold text-on-primary-container">
                          {initials(u.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-on-surface">{u.name}</p>
                          <p className="truncate text-xs text-on-surface-variant">
                            {u.role ? ROLE_META[u.role].label : "—"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-on-surface">{u.companyName ?? "—"}</td>
                    <td className="px-5 py-4 text-sm text-on-surface-variant">
                      {u.mobileNumber ? `${u.countryCode ? `${u.countryCode} ` : ""}${u.mobileNumber}` : "—"}
                    </td>
                    <td className="px-5 py-4 text-sm text-on-surface-variant">{u.email}</td>
                    <td className="px-5 py-4">
                      <StatusPill {...KYC_STATUS_META[u.kycStatus]} />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelected(u)}
                        className="text-xs font-bold uppercase tracking-wide text-primary transition-colors hover:text-primary-dim"
                      >
                        View Profile
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-outline/10 px-5 py-4">
            <p className="text-sm text-on-surface-variant">
              Showing {rangeStart}–{rangeEnd} of {total} users
            </p>
            <div className="flex items-center gap-1">
              <PageButton icon="chevron_left" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)} />
              <span className="px-3 text-sm font-semibold text-on-surface">
                {safePage} / {totalPages}
              </span>
              <PageButton icon="chevron_right" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)} />
            </div>
          </div>
        </AsyncState>
      </Card>

      <UserDetailDrawer user={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function PageButton({ icon, disabled, onClick }: { icon: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex size-9 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-high disabled:opacity-40 disabled:hover:bg-transparent"
    >
      <Icon name={icon} size={20} />
    </button>
  );
}
