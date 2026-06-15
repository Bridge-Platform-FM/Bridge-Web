"use client";

import { RoleDashboard } from "./RoleDashboard";

export function SuperAdminView() {
  return (
    <RoleDashboard
      title="Super Admin Dashboard"
      subtitle="Platform-wide overview and controls."
      stats={[
        { label: "Total Users", value: "12,480", icon: "group" },
        { label: "Organizations", value: "1,032", icon: "corporate_fare" },
        { label: "Pending KYC", value: "57", icon: "verified_user" },
        { label: "Active Today", value: "3,219", icon: "trending_up" },
      ]}
      placeholder="Manage users, organizations, KYC approvals, and platform settings from here."
    />
  );
}
