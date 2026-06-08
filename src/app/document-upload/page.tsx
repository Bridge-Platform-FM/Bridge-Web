"use client";

import { useForm, Controller } from "react-hook-form";
import { Icon } from "@/components/ui/Icon";
import { DocumentUploadCard } from "@/components/onboarding/DocumentUploadCard";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";
import { Button } from "@/components/ui/Button";
import { FocusedHeader } from "@/components/onboarding/FocusedHeader";

/** react-hook-form shape: one record of slot→File per document card. */
interface DocumentUploadForm {
  aadhaar: Record<string, File | null>;
  pan: Record<string, File | null>;
}

function ErrorText({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <span className="px-1 text-xs font-medium text-error">{msg}</span>;
}

export default function DocumentUploadPage() {
  const { goNext } = useOnboarding();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<DocumentUploadForm>({
    defaultValues: { aadhaar: {}, pan: {} },
  });

  const onSubmit = () => {
    goNext("kycdoc");
  };

  return (
      <div className="mx-auto my-6 w-full max-w-3xl rounded-2xl bg-surface-container-lowest ambient-shadow border border-white/40 flex flex-col gap-3 !p-6 sm:!p-8 lg:gap-6 lg:!p-8">
      <FocusedHeader backHref="/complete-profile" />
      <div>
        <p className="mt-3 flex items-center gap-2 text-sm text-on-surface-variant">
          <Icon name="verified" size={16} filled className="text-primary" />
          Government issued ID required for secure verification
        </p>
      </div>

      <h2 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface">Document Upload</h2>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
        <Controller
          control={control}
          name="aadhaar"
          rules={{
            validate: (v) =>
              (!!v?.front && !!v?.back) || "Upload both the front and back of your Aadhaar card.",
          }}
          render={({ field }) => (
            <DocumentUploadCard
              title="Aadhaar Card"
              subtitle="Front and back view required"
              icon="badge"
              slots={[
                { key: "front", label: "Front Side" },
                { key: "back", label: "Back Side" },
              ]}
              onChange={field.onChange}
            />
          )}
        />
        <ErrorText msg={errors.aadhaar?.message as string | undefined} />

        <Controller
          control={control}
          name="pan"
          rules={{ validate: (v) => !!v?.pan || "Upload a clear photo of your PAN card." }}
          render={({ field }) => (
            <DocumentUploadCard
              title="PAN Card"
              subtitle="Clear photo of the original card"
              icon="credit_card"
              slots={[{ key: "pan", label: "PAN Card" }]}
              onChange={field.onChange}
              hint="Ensure all details including Name, DOB and PAN Number are clearly visible. Avoid glare from lights."
            />
          )}
        />
        <ErrorText msg={errors.pan?.message as string | undefined} />

        <div className="flex flex-col gap-3">
          <Button type="submit" variant="primary" className="h-[52px] text-base rounded-xl" trailingIcon="chevron_right">
            Submit for Verification
          </Button>
        </div>
      </form>
      </div>
  );
}
