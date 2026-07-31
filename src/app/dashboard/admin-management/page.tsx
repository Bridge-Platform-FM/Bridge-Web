"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { AsyncState } from "@/components/ui/AsyncState";
import { Modal } from "@/components/modal/Modal";
import { useAuth } from "@/components/auth/AuthProvider";
import { StatusPill } from "@/components/dashboard/kyc-status";
import { TablePager } from "@/components/dashboard/TablePager";
import {
  ADMIN_STATUS_META,
  AdminDetailDrawer,
  CreateAdminModal,
  EditPermissionsModal,
  roleProfileLabel,
} from "@/components/dashboard/admin-management/AdminDialogs";
import { fetchAdmins, setAdminStatus } from "@/services/admin.service";
import { formatDate, initials, timeAgo } from "@/lib/admin-format";
import { isSuperAdmin } from "@/lib/roles";
import type { AdminAccount } from "@/types/api.types";
import type { ApiError } from "@/lib/axios";

const PAGE_SIZE = 10;

const ROLE_OPTIONS = [
  { value: "", label: "All Roles" },
  { value: "super_admin", label: "Super Admin" },
  { value: "admin", label: "Admin" },
];

export default function AdminManagementPage() {
  const router = useRouter();
  const { role, isLoaded } = useAuth();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);

  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // One piece of state per dialog — only one is ever open at a time.
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<AdminAccount | null>(null);
  const [editing, setEditing] = useState<AdminAccount | null>(null);
  const [confirming, setConfirming] = useState<AdminAccount | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);

  // Super-admin only — covers direct URL access (the sidebar already hides it for others).
  useEffect(() => {
    if (isLoaded && !isSuperAdmin(role)) router.replace("/dashboard");
  }, [isLoaded, role, router]);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchAdmins()
      .then(setAdmins)
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
    return admins.filter((a) => {
      if (roleFilter && a.role !== roleFilter) return false;
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        (roleProfileLabel(a.roleProfile) ?? "").toLowerCase().includes(q)
      );
    });
  }, [admins, search, roleFilter]);

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
  const onRole = (v: string) => {
    setRoleFilter(v);
    setPage(1);
  };

  /** Patch one row in place after a dialog saves, so the table doesn't need a refetch. */
  const patchAdmin = useCallback((id: string, changes: Partial<AdminAccount>) => {
    setAdmins((prev) => prev.map((a) => (a.id === id ? { ...a, ...changes } : a)));
  }, []);

  /** Suspend / reactivate, confirmed through the dialog below. */
  const handleToggleStatus = async () => {
    if (!confirming) return;
    const next = confirming.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    setStatusSaving(true);
    try {
      await setAdminStatus(confirming.id, next);
      patchAdmin(confirming.id, { status: next });
      toast.success(
        next === "SUSPENDED" ? `${confirming.name} was suspended.` : `${confirming.name} was reactivated.`
      );
      setConfirming(null);
    } catch (err) {
      toast.error((err as ApiError).message || "Couldn't update the admin. Please try again.");
    } finally {
      setStatusSaving(false);
    }
  };

  if (!isLoaded || !isSuperAdmin(role)) return null;

  return (
    <div className="mx-auto max-w-6xl p-6 md:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-headline text-2xl font-extrabold tracking-[-0.02em] text-on-surface md:text-3xl">
            Admin Management
          </h1>
          <p className="mt-1 text-on-surface-variant">
            Manage the team that runs the platform and what each member can reach.
          </p>
        </div>
        <Button variant="primary" leadingIcon="add" onClick={() => setCreating(true)}>
          Create New Admin
        </Button>
      </div>

      {/* Filters */}
      <Card surface="lowest" padding="sm" className="mb-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
          <Input
            placeholder="Search by name, email, role profile…"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            adornment={<Icon name="search" size={18} />}
          />
          <div className="sm:w-52">
            <Select aria-label="Role" options={ROLE_OPTIONS} value={roleFilter} onChange={onRole} placeholder="All Roles" />
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
          emptyIcon="admin_panel_settings"
          emptyText="No administrators match these filters."
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead>
                <tr className="border-b border-outline/10">
                  {["Admin Name", "Role", "Created Date", "Last Login", "Perms", "Status", ""].map((h, i) => (
                    <th key={i} className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((a) => (
                  <tr
                    key={a.id}
                    className="group border-b border-outline/5 transition-colors last:border-0 hover:bg-surface-container-low"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-container text-sm font-bold text-on-primary-container">
                          {initials(a.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-on-surface">{a.name}</p>
                          <p className="truncate text-xs text-on-surface-variant">{a.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded bg-surface-container-high px-2 py-1 text-[10px] font-bold uppercase tracking-tight text-on-surface-variant">
                        {a.role === "super_admin" ? "Super Admin" : "Admin"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-on-surface-variant">
                      {a.createdAt ? formatDate(a.createdAt) : "—"}
                    </td>
                    <td className="px-5 py-4 text-sm text-on-surface-variant">
                      {a.lastLoginAt ? timeAgo(a.lastLoginAt) : "—"}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="rounded-full bg-surface-container px-2 py-0.5 text-xs font-semibold text-on-secondary-container">
                        {a.role === "super_admin" ? "All" : a.permissions.length}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <StatusPill {...ADMIN_STATUS_META[a.status]} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                        <RowAction icon="visibility" label={`View ${a.name}`} title="View Details" onClick={() => setViewing(a)} />
                        <RowAction
                          icon="lock_open"
                          label={`Edit permissions for ${a.name}`}
                          title="Edit Permissions"
                          onClick={() => setEditing(a)}
                        />
                        <RowAction
                          icon={a.status === "ACTIVE" ? "block" : "restart_alt"}
                          label={`${a.status === "ACTIVE" ? "Suspend" : "Reactivate"} ${a.name}`}
                          title={a.status === "ACTIVE" ? "Suspend Admin" : "Reactivate Admin"}
                          danger={a.status === "ACTIVE"}
                          onClick={() => setConfirming(a)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <TablePager
            page={safePage}
            totalPages={totalPages}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            total={total}
            noun="administrators"
            onPage={setPage}
          />
        </AsyncState>
      </Card>

      {/* Dialogs */}
      <CreateAdminModal open={creating} onClose={() => setCreating(false)} onCreated={load} />
      <AdminDetailDrawer admin={viewing} onClose={() => setViewing(null)} />
      <EditPermissionsModal
        admin={editing}
        onClose={() => setEditing(null)}
        onSaved={(id, roleProfile, permissions) => patchAdmin(id, { roleProfile, permissions })}
      />

      <Modal
        open={confirming !== null}
        onClose={() => setConfirming(null)}
        title={confirming?.status === "ACTIVE" ? "Suspend admin?" : "Reactivate admin?"}
        maxWidthClass="max-w-md"
        bodyClassName="p-6"
        footer={
          <>
            <button
              type="button"
              onClick={() => setConfirming(null)}
              disabled={statusSaving}
              className="flex h-11 items-center rounded-xl px-5 text-sm font-bold text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleToggleStatus}
              disabled={statusSaving}
              className="flex h-11 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-on-primary transition-colors hover:bg-primary-dim disabled:opacity-50"
            >
              {statusSaving ? "Saving…" : confirming?.status === "ACTIVE" ? "Suspend" : "Reactivate"}
            </button>
          </>
        }
      >
        <p className="text-sm text-on-surface-variant">
          {confirming?.status === "ACTIVE" ? (
            <>
              <span className="font-semibold text-on-surface">{confirming?.name}</span> will lose access to the
              admin dashboard immediately. You can reactivate them later.
            </>
          ) : (
            <>
              <span className="font-semibold text-on-surface">{confirming?.name}</span> will regain access to the
              admin dashboard with their previous permissions.
            </>
          )}
        </p>
      </Modal>
    </div>
  );
}

/** One icon button in the Actions cell. */
function RowAction({
  icon,
  label,
  title,
  danger = false,
  onClick,
}: {
  icon: string;
  label: string;
  title: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={label}
      className={`flex size-9 items-center justify-center rounded-lg transition-colors ${
        danger
          ? "text-error hover:bg-error-container/30"
          : "text-on-surface-variant hover:bg-surface-container-high hover:text-primary"
      }`}
    >
      <Icon name={icon} size={20} />
    </button>
  );
}
