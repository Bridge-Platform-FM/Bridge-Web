"use client";

import { RoleDashboard } from "./RoleDashboard";

export function InvestorView() {
  return (
    <RoleDashboard
      title="Investor Dashboard"
      subtitle="Discover startups and manage your portfolio."
      stats={[
        { label: "New Deals", value: "23", icon: "handshake" },
        { label: "Portfolio Cos.", value: "11", icon: "donut_large" },
        { label: "Watchlist", value: "34", icon: "bookmark" },
        { label: "Meetings", value: "5", icon: "event" },
      ]}
      placeholder="Review your deal flow, track portfolio companies, and manage documents."
    />
  );
}
