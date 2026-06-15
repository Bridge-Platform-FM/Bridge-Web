/**
 * Single source of truth for the dynamic dashboard sidebar.
 *
 * The sidebar renders `DASHBOARD_NAV[role]` for the current role — to add, remove,
 * rename or reorder a role's menu, edit ONLY this file (same philosophy as
 * onboarding-steps.ts). Routes are nested under `/dashboard/*`; add the matching
 * `src/app/dashboard/<segment>/page.tsx` as each section is built out.
 */

import type { Role } from "@/lib/roles";

export interface NavItem {
  key: string;
  label: string;
  /** Material Symbols Outlined icon name. */
  icon: string;
  /** Absolute route under /dashboard. */
  route: string;
}

// Items shared across the three user roles — declared once, reused below.
const DASHBOARD: NavItem = { key: "dashboard", label: "Dashboard", icon: "space_dashboard", route: "/dashboard" };
const REELS: NavItem = { key: "reels", label: "Reels", icon: "smart_display", route: "/dashboard/reels" };
const AI_INSIGHTS: NavItem = { key: "ai-insights", label: "AI Insights", icon: "auto_awesome", route: "/dashboard/ai-insights" };
const DISCOVER: NavItem = { key: "discover", label: "Discover", icon: "explore", route: "/dashboard/discover" };
const CONNECTIONS: NavItem = { key: "connections", label: "Connections", icon: "hub", route: "/dashboard/connections" };
const DEAL_ROOM: NavItem = { key: "deal-room", label: "Deal Room", icon: "handshake", route: "/dashboard/deal-room" };
const PROFILE: NavItem = { key: "profile", label: "Profile", icon: "account_circle", route: "/dashboard/profile" };

// Shared staff (admin / super_admin) menu — declared once, reused for both roles.
const STAFF_NAV: NavItem[] = [
  DASHBOARD,
  { key: "matching-engine", label: "Matching Engine", icon: "join_inner", route: "/dashboard/matching-engine" },
  { key: "user-management", label: "User Management", icon: "manage_accounts", route: "/dashboard/user-management" },
  { key: "kyc-review", label: "KYC Review", icon: "verified_user", route: "/dashboard/kyc-review" },
  { key: "subscription", label: "Subscription", icon: "card_membership", route: "/dashboard/subscription" },
  PROFILE,
];

/** Support entry pinned above Logout for staff roles (see DashboardSidebar). */
export const SUPPORT_NAV: NavItem = { key: "support", label: "Support", icon: "support_agent", route: "/dashboard/support" };

export const DASHBOARD_NAV: Record<Role, NavItem[]> = {
  super_admin: STAFF_NAV,
  admin: STAFF_NAV,
  startup: [
    DASHBOARD,
    { key: "find-investors", label: "Find Investors", icon: "savings", route: "/dashboard/find-investors" },
    REELS,
    AI_INSIGHTS,
    DISCOVER,
    CONNECTIONS,
    DEAL_ROOM,
    PROFILE,
  ],
  investor: [
    DASHBOARD,
    { key: "browse-startups", label: "Browse Startups", icon: "rocket_launch", route: "/dashboard/browse-startups" },
    REELS,
    AI_INSIGHTS,
    DISCOVER,
    CONNECTIONS,
    DEAL_ROOM,
    PROFILE,
  ],
  b2b_enterprise: [
    DASHBOARD,
    { key: "match", label: "Match", icon: "join_inner", route: "/dashboard/match" },
    REELS,
    { key: "global", label: "Global", icon: "public", route: "/dashboard/global" },
    AI_INSIGHTS,
    { key: "expand", label: "Expand", icon: "open_in_full", route: "/dashboard/expand" },
    DISCOVER,
    CONNECTIONS,
    DEAL_ROOM,
    PROFILE,
  ],
};

/** Nav items for a role (empty array if the role is unknown). */
export function getNavForRole(role: Role): NavItem[] {
  return DASHBOARD_NAV[role] ?? [];
}
