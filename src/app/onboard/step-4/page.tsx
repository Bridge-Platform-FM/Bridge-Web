import React from 'react';
import { OnboardCard } from '@/components/onboard/OnboardCard';
import Link from 'next/link';

export default function Step4Page() {
  return (
    <OnboardCard step={4} title="Authorized Signatory">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-slate-600">Authorized Signatory placeholder...</p>
        <Link href="/onboard/step-5" className="mt-4 flex w-full justify-center rounded-xl bg-blue-600 px-3 py-3 text-sm font-semibold text-white hover:bg-blue-500">
          Continue
        </Link>
      </div>
    </OnboardCard>
  );
}
