"use client";

import React from "react";
import { Icon } from "@/components/ui/Icon";
import { StepProgress } from "@/components/onboarding/StepProgress";
import { DocumentUploadCard } from "@/components/onboarding/DocumentUploadCard";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";

export default function DocumentUploadPage() {
  const { goNext } = useOnboarding();

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-12">
        <StepProgress stepKey="authorized" />
        <p className="mt-3 flex items-center gap-2 text-sm text-on-surface-variant">
          <Icon name="verified" size={16} filled className="text-primary" />
          Government issued ID required for secure verification
        </p>
      </div>

      <h2 className="mb-6 font-headline text-3xl font-extrabold tracking-tight text-on-surface">Document Upload</h2>

      <DocumentUploadCard
        title="Aadhaar Card"
        subtitle="Front and back view required"
        icon="badge"
        uploadedName="aadhaar_front_back.pdf"
      />

      <DocumentUploadCard
        title="PAN Card"
        subtitle="Clear photo of the original card"
        icon="credit_card"
      />

      <div className="mt-4 flex items-start gap-3 rounded-xl bg-surface-container-high/50 p-4">
        <Icon name="info" size={16} className="pt-0.5 text-on-surface-variant" />
        <p className="text-xs leading-relaxed text-on-surface-variant">
          Ensure all details including Name, DOB and PAN Number are clearly visible. Avoid glare from lights.
        </p>
      </div>

      <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-between">
        <button
          onClick={() => goNext("authorized")}
          className="cta-gradient flex h-14 items-center justify-center gap-2 rounded-xl px-8 font-bold text-lg text-on-primary shadow-lg shadow-primary/20 transition-all hover:scale-[1.01]"
        >
          Submit Documents
          <Icon name="chevron_right" size={20} />
        </button>
      </div>
    </div>
  );
}
