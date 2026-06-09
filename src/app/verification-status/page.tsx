"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { FocusedHeader } from "@/components/onboarding/FocusedHeader";
import { DocumentPreviewModal } from "@/components/onboarding/DocumentPreviewModal";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";
import { useFilePreview } from "@/lib/useFilePreview";

/** A submitted document: label + the s3 key returned by the scan upload. */
interface SubmittedDoc {
  label: string;
  icon: string;
  s3Key: string;
}

/**
 * One submitted-document tile: lazily loads the watermarked thumbnail for its s3 key
 * and opens the full preview modal on click. Falls back to the document icon while
 * loading or if the thumbnail can't be fetched.
 */
function SubmittedDocTile({ doc, onPreview }: { doc: SubmittedDoc; onPreview: () => void }) {
  const { url, isPdf, loading } = useFilePreview(doc.s3Key);
  const showThumb = url && !isPdf;
  return (
    <button
      type="button"
      onClick={onPreview}
      className="group relative flex aspect-[16/9] flex-col items-center justify-center gap-2 overflow-hidden rounded-lg border border-outline-variant/20 bg-surface-container-highest text-on-surface-variant transition-colors hover:border-primary/40"
    >
      {showThumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={doc.label} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <>
          <Icon name={loading ? "progress_activity" : doc.icon} size={28} className={loading ? "animate-spin text-primary" : ""} />
          <span className="px-2 text-center text-xs font-semibold">{doc.label}</span>
        </>
      )}

      {/* Label + hover "Preview" hint over the thumbnail */}
      {showThumb && (
        <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/50 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="flex items-center gap-1 text-xs font-bold text-white">
            <Icon name="zoom_in" size={14} /> {doc.label}
          </span>
        </div>
      )}

      <div className="absolute right-2 top-2 rounded-full bg-primary p-1 text-white">
        <Icon name="check" size={12} />
      </div>
    </button>
  );
}

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
  const { data } = useOnboarding();
  const [remaining, setRemaining] = useState(INITIAL_SECONDS);
  const [previewKey, setPreviewKey] = useState<string | null>(null);

  // Build the submitted-document list from the s3 keys saved on the upload step.
  const submitted: SubmittedDoc[] = [
    { label: "Aadhaar (Front)", icon: "badge", s3Key: data.aadhaarFrontKey as string },
    { label: "Aadhaar (Back)", icon: "badge", s3Key: data.aadhaarBackKey as string },
    { label: "PAN Card", icon: "credit_card", s3Key: data.panKey as string },
  ].filter((d): d is SubmittedDoc => !!d.s3Key);

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
    <div className="flex min-h-[calc(100vh-4rem)] w-full items-center justify-center px-4 py-4">
    <div className="mx-auto w-full max-w-[760px] rounded-2xl bg-surface-container-lowest ambient-shadow border border-white/40 flex flex-col gap-3 !p-5 sm:!p-6 lg:gap-4 lg:!p-6">
      <FocusedHeader backLabel="Back to Overview" backHref="/document-upload" />

      {/* <div className="mb-8 mt-4 rounded-xl bg-surface-container-low p-6">
         <StepProgress stepKey="status" showLabels={false} /> 
      </div> */}

      {/* Status hero */}
      <div className="flex flex-col items-center px-4 text-center">
        <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-primary-container text-primary shadow-sm">
          <Icon name="pending_actions" size={24} />
        </div>
        <h1 className="mb-2 font-headline text-2xl font-extrabold tracking-tight text-on-surface md:text-3xl">
          Verification in Progress
        </h1>
        <p className="max-w-[600px] text-base leading-relaxed text-on-surface-variant">
          We&apos;ve received your documents. Our compliance team is currently performing a secure audit to ensure your account&apos;s safety.
        </p>
      </div>

      {/* Timer + info */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col items-center justify-center rounded-xl border border-outline-variant/10 bg-surface-container-lowest p-5 shadow-sm">
          <span className="mb-4 font-label text-sm uppercase tracking-wider text-on-surface-variant">Estimated Time Remaining</span>
          <div className="flex items-center gap-4">
            <TimeBox value={pad(hours)} unit="Hours" />
            <span className="mb-6 text-2xl font-bold text-surface-dim">:</span>
            <TimeBox value={pad(mins)} unit="Mins" />
            <span className="mb-6 text-2xl font-bold text-surface-dim">:</span>
            <TimeBox value={pad(secs)} unit="Secs" />
          </div>
        </div>

        <div className="rounded-xl border border-outline-variant/10 bg-surface-container-high p-5">
          <h3 className="mb-3 font-headline font-bold text-on-surface">What happens next?</h3>
          <ul className="space-y-3">
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
      <div>
        <h3 className="mb-3 font-headline text-lg font-bold text-on-surface">Submitted Documents</h3>
        {submitted.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {submitted.map((d) => (
              <SubmittedDocTile key={d.label} doc={d} onPreview={() => setPreviewKey(d.s3Key)} />
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-outline-variant/20 bg-surface-container-highest px-4 py-6 text-center text-sm text-on-surface-variant">
            No documents found for this session.
          </p>
        )}
      </div>

      {/* Actions */}
      {/* <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
        <button className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-surface-container-high px-8 font-bold text-on-surface transition-all hover:bg-surface-container-highest sm:w-auto">
          <Icon name="contact_support" size={20} /> Contact Support
        </button>
      </div> */}
      <DocumentPreviewModal s3Key={previewKey} onClose={() => setPreviewKey(null)} />
    </div>
    </div>
  );
}
