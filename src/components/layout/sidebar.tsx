"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { BrandLockup } from "@/components/layout/navbar";
import { useAuth } from "@/components/auth/AuthProvider";
import { SwitchUserModal } from "@/components/dashboard/SwitchUserModal";
import { getNavForRole } from "@/lib/dashboard-nav";
import { ROLE_META, isUserRole } from "@/lib/roles";

/**
 * Dynamic dashboard sidebar. Reads the current role from `useAuth()` and renders
 * `DASHBOARD_NAV[role]` (active route highlighted via usePathname). Profile + the
 * Logout control are pinned at the bottom; user roles also get a "Switch User"
 * entry that opens the SwitchUserModal.
 */
export function DashboardSidebar() {
  const pathname = usePathname();
  const { role, user, logout } = useAuth();
  const [switchOpen, setSwitchOpen] = useState(false);

  if (!role) return null;

  const navItems = getNavForRole(role);
  const meta = ROLE_META[role];

  /** Active when the path equals the route, or is a nested child of it. */
  const isActive = (route: string) =>
    route === "/dashboard" ? pathname === route : pathname.startsWith(route);

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-outline-variant/30 bg-surface-container-low">
      {/* Brand — same lockup as the global navbar */}
      <Link href="/dashboard" className="flex items-center px-5 py-5">
        <BrandLockup />
      </Link>

      {/* Nav — scrolls if it overflows */}
      <nav className="thin-scrollbar flex-1 overflow-y-auto px-3 py-2">
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => {
            const active = isActive(item.route);
            return (
              <li key={item.key}>
                <Link
                  href={item.route}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                    active
                      ? "bg-primary-container/50 text-primary"
                      : "text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface"
                  }`}
                >
                  <Icon name={item.icon} size={20} filled={active} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom-pinned: switch user (user roles only) + profile + logout */}
      <div className="border-t border-outline-variant/30 p-3">
        {isUserRole(role) && (
          <button
            type="button"
            onClick={() => setSwitchOpen(true)}
            className="mb-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container-highest hover:text-on-surface"
          >
            <Icon name="swap_horiz" size={20} />
            Switch User
          </button>
        )}

        <div className="flex items-center gap-3 rounded-xl px-3 py-2">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
            <Icon name={meta.icon} size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-on-surface">
              {user?.name ?? meta.label}
            </p>
            <p className="truncate text-xs text-on-surface-variant">{meta.label}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={logout}
          className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-error transition-colors hover:bg-error/10"
        >
          <Icon name="logout" size={20} />
          Logout
        </button>
      </div>

      <SwitchUserModal open={switchOpen} onClose={() => setSwitchOpen(false)} />
    </aside>
  );
}
