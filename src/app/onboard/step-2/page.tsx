import React from 'react';
import { OnboardCard } from '@/components/onboard/OnboardCard';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

export default function Step2Page() {
  return (
    <OnboardCard step={2} title="Verification">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-slate-600">Verification details placeholder...</p>
        <Link href="/onboard/step-3" className="mt-4 flex w-full justify-center rounded-xl bg-blue-600 px-3 py-3 text-sm font-semibold text-white hover:bg-blue-500">
          Continue
        </Link>
      </div>
    </OnboardCard>
  );
}
