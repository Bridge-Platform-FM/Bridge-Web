import React from 'react';
import { OnboardCard } from '@/components/onboard/OnboardCard';
import Link from 'next/link';

export default function Step3Page() {
  return (
    <OnboardCard step={3} title="Address Details">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-slate-600">Address placeholder...</p>
        <Link href="/onboard/step-4" className="mt-4 flex w-full justify-center rounded-xl bg-blue-600 px-3 py-3 text-sm font-semibold text-white hover:bg-blue-500">
          Continue
        </Link>
      </div>
    </OnboardCard>
  );
}
