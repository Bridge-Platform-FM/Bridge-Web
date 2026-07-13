"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { BrandLockup } from "@/components/layout/navbar";
import { useAuth } from "@/components/auth/AuthProvider";
import { SwitchUserModal } from "@/components/dashboard/SwitchUserModal";
import { getNavForRole, SUPPORT_NAV } from "@/lib/dashboard-nav";
import { ROLE_META, isUserRole, isStaffRole } from "@/lib/roles";
/** Width of the collapsed rail (`w-20`), in px — used to place the fixed tooltip. */
const COLLAPSED_WIDTH = 80;

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
  const [collapsed, setCollapsed] = useState(false);
  const [hoverLabel, setHoverLabel] = useState<{ text: string; top: number } | null>(null);

  if (!role) return null;

  const navItems = getNavForRole(role);
  const meta = ROLE_META[role];

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
      <Link href="/dashboard" className="flex items-center px-5 py-5">
        <BrandLockup showLabel={!collapsed} />
      </Link>
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute right-2 top-6 z-10 flex size-6 items-center justify-center text-on-surface-variant transition-colors hover:text-on-surface"
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
                    collapsed ? "justify-center" : ""
                  } ${
                    active
                      ? "bg-primary-container/50 text-primary"
                      : "text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface"
                  }`}
                >
                  <Icon name={item.icon} size={20} filled={active} />
                  {!collapsed && item.label}
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
            onMouseEnter={(e) => showLabel(e, "Switch User")}
            onMouseLeave={hideLabel}
            className={`mb-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container-highest hover:text-on-surface ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <Icon name="swap_horiz" size={20} />
            {!collapsed && "Switch User"}
          </button>
        )}

        <div
          onMouseEnter={(e) => showLabel(e, `${user?.name || user?.email || meta.label} · ${meta.label}`)}
          onMouseLeave={hideLabel}
          className={`flex items-center gap-3 rounded-xl px-3 py-2 ${collapsed ? "justify-center" : ""}`}
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
            <Icon name={meta.icon} size={20} />
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-on-surface">
                {user?.name || user?.email || meta.label}
              </p>
              <p className="truncate text-xs text-on-surface-variant">{meta.label}</p>
            </div>
          )}
        </div>

        {isStaffRole(role) && (
          <Link
            href={SUPPORT_NAV.route}
            aria-current={isActive(SUPPORT_NAV.route) ? "page" : undefined}
            onMouseEnter={(e) => showLabel(e, SUPPORT_NAV.label)}
            onMouseLeave={hideLabel}
            className={`mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
              collapsed ? "justify-center" : ""
            } ${
              isActive(SUPPORT_NAV.route)
                ? "bg-primary-container/50 text-primary"
                : "text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface"
            }`}
          >
            <Icon name={SUPPORT_NAV.icon} size={20} filled={isActive(SUPPORT_NAV.route)} />
            {!collapsed && SUPPORT_NAV.label}
          </Link>
        )}

        <button
          type="button"
          onClick={logout}
          onMouseEnter={(e) => showLabel(e, "Logout")}
          onMouseLeave={hideLabel}
          className={`mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-error transition-colors hover:bg-error/10 ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <Icon name="logout" size={20} />
          {!collapsed && "Logout"}
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
