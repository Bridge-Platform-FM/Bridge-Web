"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/components/auth/AuthProvider";
import { DashboardSidebar } from "@/components/layout/sidebar";
import { DashboardNavbar } from "@/components/layout/navbar";
import { getSessionLimitStatus } from "@/services/session.service";
const FULL_SESSION_TOKEN_TYPE = "AUTH_ACCESS_TOKEN";

function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { role, tokenType, isLoaded } = useAuth();
  const hasFullSession = tokenType === FULL_SESSION_TOKEN_TYPE;
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (!hasFullSession || !role) {
      router.replace("/login");
      return;
    }
    let cancelled = false;
    getSessionLimitStatus()
      .then(() => {
        if (!cancelled) setVerified(true);
      })
      .catch(() => {
        // A 401 here is handled globally by lib/axios.ts's response interceptor
        // (clears the session + redirects to /login) — nothing extra to do here.
        // verified stays false either way, so children never render.
      });
    return () => {
      cancelled = true;
    };
  }, [isLoaded, role, hasFullSession, router]);

  if (!isLoaded || !role || !hasFullSession || !verified) {
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
