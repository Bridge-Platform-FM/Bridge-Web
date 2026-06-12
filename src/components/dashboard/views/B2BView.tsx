"use client";

import { RoleDashboard } from "./RoleDashboard";

export function B2BView() {
  return (
    <RoleDashboard
      title="B2B Enterprise Dashboard"
      subtitle="Find partners across the supply chain."
      stats={[
        { label: "Marketplace Leads", value: "41", icon: "storefront" },
        { label: "Active Contracts", value: "7", icon: "contract" },
        { label: "Partners", value: "16", icon: "diversity_3" },
        { label: "Documents", value: "12", icon: "folder" },
      ]}
      placeholder="Browse the marketplace, manage contracts, and connect with verified partners."
    />
  );
}
