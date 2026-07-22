"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/components/auth/AuthProvider";
import { DashboardSidebar } from "@/components/layout/sidebar";
import { DashboardNavbar } from "@/components/layout/navbar";

/**
 * Guards the dashboard for UX: bounce to /login when there's no local session (role).
 * The real enforcement is server-side — the edge middleware.ts checks the httpOnly
 * access cookie, and every API call 401s without it. The token itself is httpOnly, so
 * it can't be read here; session role presence is the client-side signal.
 */
function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { role, isLoaded } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;
    if (!role) router.replace("/login");
  }, [isLoaded, role, router]);

  if (!isLoaded || !role) {
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
