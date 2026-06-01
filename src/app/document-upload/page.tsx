"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { StepProgress } from "@/components/onboarding/StepProgress";
import { DocumentUploadCard } from "@/components/onboarding/DocumentUploadCard";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";
import { Button } from "@/components/ui/Button";
import { FocusedHeader } from "@/components/onboarding/FocusedHeader";

type Errors = Record<string, string>;

function ErrorText({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <span className="px-1 text-xs font-medium text-error">{msg}</span>;
}

export default function DocumentUploadPage() {
  const { goNext } = useOnboarding();
  const [aadhaar, setAadhaar] = useState<Record<string, File | null>>({});
  const [pan, setPan] = useState<Record<string, File | null>>({});
  const [errors, setErrors] = useState<Errors>({});

  const clearError = (name: string) =>
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });

  const submit = () => {
    const found: Errors = {};
    if (!aadhaar.front || !aadhaar.back)
      found.aadhaar = "Upload both the front and back of your Aadhaar card.";
    if (!pan.pan) found.pan = "Upload a clear photo of your PAN card.";

    setErrors(found);
    if (Object.keys(found).length > 0) return;

    goNext("kycdoc");
  };

  return (
    
    // <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-6 py-6">
      <div className="mx-auto my-6 w-full max-w-3xl rounded-2xl bg-surface-container-lowest ambient-shadow border border-white/40 flex flex-col gap-3 !p-6 sm:!p-8 lg:gap-6 lg:!p-8">
      <FocusedHeader backHref="/complete-profile" />
      <div>
        {/* <StepProgress stepKey="kycdoc" /> */}
        <p className="mt-3 flex items-center gap-2 text-sm text-on-surface-variant">
          <Icon name="verified" size={16} filled className="text-primary" />
          Government issued ID required for secure verification
        </p>
      </div>

      <h2 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface">Document Upload</h2>

      <DocumentUploadCard
        title="Aadhaar Card"
        subtitle="Front and back view required"
        icon="badge"
        slots={[
          { key: "front", label: "Front Side" },
          { key: "back", label: "Back Side" },
        ]}
        onChange={(files) => {
          setAadhaar(files);
          clearError("aadhaar");
        }}
      />
      {errors.aadhaar && (
        <div className="-mt-2">
          <ErrorText msg={errors.aadhaar} />
        </div>
      )}

      <DocumentUploadCard
        title="PAN Card"
        subtitle="Clear photo of the original card"
        icon="credit_card"
        slots={[{ key: "pan", label: "PAN Card" }]}
        onChange={(files) => {
          setPan(files);
          clearError("pan");
        }}
        hint="Ensure all details including Name, DOB and PAN Number are clearly visible. Avoid glare from lights."
      />
      
      {errors.pan && (
        <div className="-mt-2">
          <ErrorText msg={errors.pan} />
        </div>
      )}


      {/* <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-between">
        <button
          onClick={submit}
          className="cta-gradient flex h-14 items-center justify-center gap-2 rounded-xl px-8 font-bold text-lg text-on-primary shadow-lg shadow-primary/20 transition-all hover:scale-[1.01]"
        >
          Submit Documents
          <Icon name="chevron_right" size={20} />
        </button>
      </div> */}


      <div className=" flex flex-col gap-3">
              <Button
                variant="primary"
                className="h-[52px] text-base rounded-xl"
              >
                Submit for Verification
              </Button>
      </div>
      </div>
  )
}
