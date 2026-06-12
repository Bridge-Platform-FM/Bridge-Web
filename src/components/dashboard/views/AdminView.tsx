"use client";

import { RoleDashboard } from "./RoleDashboard";

export function AdminView() {
  return (
    <RoleDashboard
      title="Admin Dashboard"
      subtitle="Review verifications and support users."
      stats={[
        { label: "KYC To Review", value: "57", icon: "verified_user" },
        { label: "Open Tickets", value: "14", icon: "support_agent" },
        { label: "Resolved Today", value: "31", icon: "task_alt" },
        { label: "Avg. Response", value: "2h 10m", icon: "schedule" },
      ]}
      placeholder="Process pending KYC approvals and respond to user support requests."
    />
  );
}
