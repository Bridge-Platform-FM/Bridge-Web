"use client";

import { RoleDashboard } from "./RoleDashboard";

export function StartupView() {
  return (
    <RoleDashboard
      title="Startup Dashboard"
      subtitle="Raise funding and connect with investors."
      stats={[
        { label: "Profile Views", value: "248", icon: "visibility" },
        { label: "Investor Matches", value: "18", icon: "diversity_3" },
        { label: "Connections", value: "9", icon: "handshake" },
        { label: "Documents", value: "6", icon: "folder" },
      ]}
      placeholder="Showcase your traction, browse matched investors, and manage your documents."
    />
  );
}
