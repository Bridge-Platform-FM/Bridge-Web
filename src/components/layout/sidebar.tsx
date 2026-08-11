"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { BrandLockup } from "@/components/layout/navbar";
import { useAuth } from "@/components/auth/AuthProvider";
import { SwitchUserModal } from "@/components/dashboard/SwitchUserModal";
import { getNavForRole, SUPPORT_NAV } from "@/lib/dashboard-nav";
import { isStaffRole, isUserRole } from "@/lib/roles";

/** Width of the collapsed rail (`w-20`), in px — used to place the fixed tooltip. */
const COLLAPSED_WIDTH = 80;

/** Nav-row label: animates open/closed instead of mounting/unmounting, so it never
 * snaps out of sync with the rail's `width` transition (that mismatch is what made
 * icons appear to jump on repeated collapse/expand). */
function RowLabel({ collapsed, children }: { collapsed: boolean; children: React.ReactNode }) {
  return (
    <span
      className={`overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-200 ${
        collapsed ? "max-w-0 opacity-0" : "max-w-[160px] opacity-100"
      }`}
    >
      {children}
    </span>
  );
}

/**
 * Dynamic dashboard sidebar. Reads the current role from `useAuth()` and renders
 * `DASHBOARD_NAV[role]` (active route highlighted via usePathname). The Logout
 * control is pinned at the bottom; user roles also get a "Switch User" entry that
 * opens the SwitchUserModal. Support is pinned above Logout for all roles. The
 * signed-in identity lives in the navbar (see NavbarProfile), not here.
 */
export function DashboardSidebar() {
  const pathname = usePathname();
  const { role, logout } = useAuth();
  const [switchOpen, setSwitchOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [hoverLabel, setHoverLabel] = useState<{ text: string; top: number } | null>(null);

  if (!role) return null;

  const navItems = getNavForRole(role);

  /** Active when the path equals the route, or is a nested child of it. */
  const isActive = (route: string) =>
    route === "/dashboard" ? pathname === route : pathname.startsWith(route);

  const showLabel = (e: React.MouseEvent<HTMLElement>, text: string) => {
    if (!collapsed) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setHoverLabel({ text, top: rect.top + rect.height / 2 });
  };
  const hideLabel = () => setHoverLabel(null);

  return (
    <aside
      className={`relative flex h-full shrink-0 flex-col border-r border-outline-variant/30 bg-surface-container-low transition-[width] duration-200 ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Brand — same lockup as the global navbar. */}
      <div className="flex items-center py-5 pl-3 pr-10">
        <BrandLockup showLabel={!collapsed} />
      </div>
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute -right-1 top-6 z-20 flex size-7 items-center justify-center text-on-surface-variant transition-colors hover:text-on-surface"
      >
        <Icon name={collapsed ? "chevron_right" : "chevron_left"} size={18} />
      </button>

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
                  onMouseEnter={(e) => showLabel(e, item.label)}
                  onMouseLeave={hideLabel}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                    active
                      ? "bg-primary-container/50 text-primary"
                      : "text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface"
                  }`}
                >
                  <Icon name={item.icon} size={20} filled={active} className="shrink-0" />
                  <RowLabel collapsed={collapsed}>{item.label}</RowLabel>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom-pinned: switch user (user roles only) + profile + support + logout */}
      <div className="border-t border-outline-variant/30 p-3">
        {isUserRole(role) && (
          <button
            type="button"
            onClick={() => setSwitchOpen(true)}
            onMouseEnter={(e) => showLabel(e, "Switch User")}
            onMouseLeave={hideLabel}
            className="mb-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container-highest hover:text-on-surface"
          >
            <Icon name="swap_horiz" size={20} className="shrink-0" />
            <RowLabel collapsed={collapsed}>Switch User</RowLabel>
          </button>
        )}

        {/* Support — links to the FAQ page. Hidden for staff (admin / super_admin):
            they manage the FAQs instead of raising support requests. */}
        {!isStaffRole(role) && (
          <Link
            href={SUPPORT_NAV.route}
            aria-current={isActive(SUPPORT_NAV.route) ? "page" : undefined}
            onMouseEnter={(e) => showLabel(e, SUPPORT_NAV.label)}
            onMouseLeave={hideLabel}
            className={`mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
              isActive(SUPPORT_NAV.route)
                ? "bg-primary-container/50 text-primary"
                : "text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface"
            }`}
          >
            <Icon name={SUPPORT_NAV.icon} size={20} filled={isActive(SUPPORT_NAV.route)} className="shrink-0" />
            <RowLabel collapsed={collapsed}>{SUPPORT_NAV.label}</RowLabel>
          </Link>
        )}

        <button
          type="button"
          onClick={logout}
          onMouseEnter={(e) => showLabel(e, "Logout")}
          onMouseLeave={hideLabel}
          className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-error transition-colors hover:bg-error/10"
        >
          <Icon name="logout" size={20} className="shrink-0" />
          <RowLabel collapsed={collapsed}>Logout</RowLabel>
        </button>
      </div>

      {hoverLabel && (
        <span
          className="pointer-events-none fixed z-50 -translate-y-1/2 whitespace-nowrap rounded-lg bg-surface-container-highest px-2.5 py-1.5 text-xs font-semibold text-on-surface shadow-md"
          style={{ top: hoverLabel.top, left: COLLAPSED_WIDTH + 8 }}
        >
          {hoverLabel.text}
        </span>
      )}

      <SwitchUserModal open={switchOpen} onClose={() => setSwitchOpen(false)} />
    </aside>
  );
}
