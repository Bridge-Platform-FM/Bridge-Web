"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/components/auth/AuthProvider";
import { DashboardSidebar } from "@/components/layout/sidebar";
import { DashboardNavbar } from "@/components/layout/navbar";
import { getAccessToken, getRefreshToken } from "@/lib/auth-tokens";

function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { role, isLoaded } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;
    if (!getAccessToken() || !getRefreshToken() || !role) router.replace("/login");
  }, [isLoaded, role, router]);

  if (!isLoaded || !role || !getAccessToken() || !getRefreshToken()) {
    return (
      <div className="flex h-full items-center justify-center text-on-surface-variant">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <DashboardSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardNavbar />
        <div className="thin-scrollbar flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DashboardShell>{children}</DashboardShell>
    </AuthProvider>
  );
}
