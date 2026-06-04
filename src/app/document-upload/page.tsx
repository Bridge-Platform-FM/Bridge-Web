"use client";

import { useForm, Controller, useWatch } from "react-hook-form";
import { Icon } from "@/components/ui/Icon";
import { DocumentUploadCard } from "@/components/onboarding/DocumentUploadCard";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { FocusedHeader } from "@/components/onboarding/FocusedHeader";

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/; // ABCDE1234F
const AADHAAR_REGEX = /^[0-9]{12}$/; // 12 digits

/** react-hook-form shape: one record of slot→File per document card. */
interface DocumentUploadForm {
  aadhaar: Record<string, File | null>;
  pan: Record<string, File | null>;
  aadhaarNumber: string;
  panNumber: string;
}

function ErrorText({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <span className="px-1 text-xs font-medium text-error">{msg}</span>;
}

export default function DocumentUploadPage() {
  const { setData, goNext } = useOnboarding();

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DocumentUploadForm>({
    mode: "onChange",
    defaultValues: { aadhaar: {}, pan: {}, aadhaarNumber: "", panNumber: "" },
  });

  const onSubmit = (values: DocumentUploadForm) => {
    setData({ aadhaarNumber: values.aadhaarNumber, panNumber: values.panNumber });
    goNext("kycdoc");
  };

  // Live values to gate the submit button: all files + valid numbers required.
  const [aadhaar, pan, aadhaarNumber, panNumber] = useWatch({
    control,
    name: ["aadhaar", "pan", "aadhaarNumber", "panNumber"],
  });
  const allProvided =
    !!aadhaar?.front &&
    !!aadhaar?.back &&
    !!pan?.pan &&
    AADHAAR_REGEX.test(aadhaarNumber ?? "") &&
    PAN_REGEX.test((panNumber ?? "").toUpperCase());

  return (
      <div className="mx-auto w-full max-w-2xl rounded-2xl bg-surface-container-lowest ambient-shadow border border-white/40 flex flex-col gap-2 !p-5 sm:!p-6 lg:gap-3 lg:!p-6">
      <FocusedHeader backHref="/complete-profile" />
      <div>
        <h2 className="font-headline text-2xl font-extrabold tracking-tight text-on-surface">Document Upload</h2>
        <p className="mt-1 flex items-center gap-2 text-sm text-on-surface-variant">
          <Icon name="verified" size={16} filled className="text-primary" />
          Government issued ID required for secure verification
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Input
            id="aadhaarNumber"
            type="text"
            label="AADHAAR NUMBER"
            required
            inputMode="numeric"
            maxLength={12}
            placeholder="1234 5678 9012"
            error={errors.aadhaarNumber?.message}
            {...register("aadhaarNumber", {
              required: "Aadhaar number is required.",
              pattern: { value: AADHAAR_REGEX, message: "Enter a valid 12-digit Aadhaar number." },
            })}
          />
          <Input
            id="panNumber"
            type="text"
            label="PAN NUMBER"
            required
            maxLength={10}
            placeholder="ABCDE1234F"
            className="uppercase"
            error={errors.panNumber?.message}
            {...register("panNumber", {
              required: "PAN number is required.",
              validate: (v) => PAN_REGEX.test(v.toUpperCase()) || "Enter a valid PAN (e.g. ABCDE1234F).",
            })}
          />
        </div>

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
              maxSizeMB={10}
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
              maxSizeMB={10}
              onChange={field.onChange}
              hint="Ensure all details including Name, DOB and PAN Number are clearly visible. Avoid glare from lights."
            />
          )}
        />
        <ErrorText msg={errors.pan?.message as string | undefined} />

        <div className="flex flex-col gap-3">
          <Button type="submit" variant="primary" disabled={!allProvided} className="h-12 text-base rounded-xl" trailingIcon="chevron_right">
            Submit for Verification
          </Button>
        </div>
      </form>
      </div>
  );
}
