"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/components/auth/AuthProvider";
import { isUserRole } from "@/lib/roles";
import { DashboardSidebar } from "@/components/layout/sidebar";
import { DashboardNavbar } from "@/components/layout/navbar";
import { getSessionLimitStatus } from "@/services/session.service";
import type { ApiError } from "@/lib/axios";
const FULL_SESSION_TOKEN_TYPE = "AUTH_ACCESS_TOKEN";

function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { role, tokenType, isLoaded } = useAuth();
  const hasFullSession = tokenType === FULL_SESSION_TOKEN_TYPE;
  const [verified, setVerified] = useState(false);
  // Set on a non-401 verification failure (network drop, timeout, 500, CORS
  // misconfig) — a 401 is handled globally by axios.ts's interceptor (clears the
  // session + redirects), so it never needs this. Without this, a transient failure
  // would leave the user stuck on "Loading…" forever with no way out.
  const [checkError, setCheckError] = useState(false);
  // Bumped by the Retry button to re-run the verification effect.
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!isLoaded) return;
    if (!hasFullSession || !role) {
      router.replace("/login");
      return;
    }
    // Session limit is a user-only feature — admin and superadmin skip the check.
    if (!isUserRole(role)) {
      setVerified(true);
      return;
    }
    let cancelled = false;
    setCheckError(false);
    getSessionLimitStatus()
      .then(() => {
        if (!cancelled) setVerified(true);
      })
      .catch((err: ApiError) => {
        if (cancelled) return;
        // A 401 here is handled globally by lib/axios.ts's response interceptor
        // (clears the session + redirects to /login) — nothing extra to do here.
        if (err?.status !== 401) setCheckError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [isLoaded, role, hasFullSession, router, retryKey]);

  if (checkError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-on-surface-variant">
        <p>Couldn't verify your session — check your connection.</p>
        <button
          type="button"
          onClick={() => setRetryKey((k) => k + 1)}
          className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-medium hover:bg-surface-container"
        >
          Retry
        </button>
      </div>
    );
  }

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
