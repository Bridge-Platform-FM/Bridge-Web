"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { StepProgress } from "@/components/onboarding/StepProgress";
import { FocusedHeader } from "@/components/onboarding/FocusedHeader";

const SUBMITTED = [
  { label: "National ID (Front)", icon: "badge" },
  { label: "National ID (Back)", icon: "badge" },
  { label: "Live Selfie", icon: "face" },
];

const NEXT_STEPS = [
  { icon: "mark_email_unread", text: "You'll receive an email notification as soon as the review is complete." },
  { icon: "lock", text: "Full account features will be unlocked upon approval." },
  { icon: "support_agent", text: "Our team may contact you if additional information is needed." },
];

function TimeBox({ value, unit }: { value: string; unit: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex size-16 items-center justify-center rounded-lg bg-surface-container font-headline text-2xl font-bold text-on-surface">
        {value}
      </div>
      <span className="text-xs uppercase text-on-surface-variant">{unit}</span>
    </div>
  );
}

// Initial estimate shown in the countdown (23h 59m 42s).
const INITIAL_SECONDS = 23 * 3600 + 59 * 60 + 42;

export default function VerificationStatusPage() {
  const [remaining, setRemaining] = useState(INITIAL_SECONDS);

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining((s) => (s <= 0 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const hours = Math.floor(remaining / 3600);
  const mins = Math.floor((remaining % 3600) / 60);
  const secs = remaining % 60;
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="mx-auto flex max-w-[960px] flex-col px-6 py-5">
      <FocusedHeader backLabel="Back to Overview" backHref="/document-upload" />

      <div className="mb-8 mt-4 rounded-xl bg-surface-container-low p-6">
        {/* <StepProgress stepKey="status" showLabels={false} /> */}
      </div>

      {/* Status hero */}
      <div className="mb-10 flex flex-col items-center px-4 text-center">
        <div className="mb-6 flex size-20 items-center justify-center rounded-full bg-primary-container text-primary shadow-sm">
          <Icon name="pending_actions" size={40} />
        </div>
        <h1 className="mb-4 font-headline text-3xl font-extrabold tracking-tight text-on-surface md:text-4xl">
          Verification in Progress
        </h1>
        <p className="max-w-[600px] text-lg leading-relaxed text-on-surface-variant">
          We&apos;ve received your documents. Our compliance team is currently performing a secure audit to ensure your account&apos;s safety.
        </p>
      </div>

      {/* Timer + info */}
      <div className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="flex flex-col items-center rounded-xl border border-outline-variant/10 bg-surface-container-lowest p-8 shadow-sm">
          <span className="mb-6 font-label text-sm uppercase tracking-wider text-on-surface-variant">Estimated Time Remaining</span>
          <div className="flex items-center gap-4">
            <TimeBox value={pad(hours)} unit="Hours" />
            <span className="mb-6 text-2xl font-bold text-surface-dim">:</span>
            <TimeBox value={pad(mins)} unit="Mins" />
            <span className="mb-6 text-2xl font-bold text-surface-dim">:</span>
            <TimeBox value={pad(secs)} unit="Secs" />
          </div>
        </div>

        <div className="rounded-xl border border-outline-variant/10 bg-surface-container-high p-8">
          <h3 className="mb-4 font-headline font-bold text-on-surface">What happens next?</h3>
          <ul className="space-y-4">
            {NEXT_STEPS.map((s) => (
              <li key={s.text} className="flex items-start gap-3">
                <Icon name={s.icon} size={20} className="text-primary" />
                <p className="text-sm text-on-surface-variant">{s.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Submitted documents */}
      <div className="mb-10">
        <h3 className="mb-6 font-headline text-xl font-bold text-on-surface">Submitted Documents</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {SUBMITTED.map((d) => (
            <div key={d.label} className="relative flex aspect-[4/3] flex-col items-center justify-center gap-2 overflow-hidden rounded-lg border border-outline-variant/20 bg-surface-container-highest">
              <Icon name={d.icon} size={32} className="text-on-surface-variant" />
              <span className="px-2 text-center text-xs font-semibold text-on-surface-variant">{d.label}</span>
              <div className="absolute right-2 top-2 rounded-full bg-primary p-1 text-white">
                <Icon name="check" size={12} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="mb-20 flex flex-col items-center justify-center gap-4 sm:flex-row">
        <button className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-surface-container-high px-8 font-bold text-on-surface transition-all hover:bg-surface-container-highest sm:w-auto">
          <Icon name="contact_support" size={20} /> Contact Support
        </button>
      </div>

      <footer className="mt-auto border-t border-outline-variant/10 py-10 text-center">
        <p className="mb-2 text-sm text-on-surface-variant">Securely encrypted with AES-256 bank-level security.</p>
        <div className="flex items-center justify-center gap-4 text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
          <span>Privacy Policy</span>
          <span className="size-1 rounded-full bg-outline-variant" />
          <span>Security Standards</span>
          <span className="size-1 rounded-full bg-outline-variant" />
          <span>Terms of Service</span>
        </div>
      </footer>
    </div>
  );
}
