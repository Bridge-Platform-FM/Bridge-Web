'use client';

import { useState } from 'react';
import { OnboardCard } from '@/components/onboard/OnboardCard';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import {
  ShieldCheck,
  Rocket,
  ScanLine,
  Mail,
  Eye,
  EyeOff,
  Smartphone,
  Info,
} from 'lucide-react';

const ROLES = ['Startup', 'Investor', 'B2B Enterprise'] as const;
type Role = (typeof ROLES)[number];

export default function Step1Page() {
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [role, setRole] = useState<Role>('Startup');

  return (
    <div className="flex w-full min-h-[calc(100vh-4rem)]">
      {/* Promotional content restricted to Step 1 */}
      <div className="hidden lg:flex w-5/12 bg-blue-50 p-12 flex-col justify-center border-r border-slate-200">
        <div className="max-w-md space-y-8">
          <div className="space-y-4">
            <span className="inline-flex px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full tracking-wider uppercase">
              Onboarding
            </span>
            <h1 className="text-[3.5rem] leading-[1.1] font-extrabold text-slate-900 tracking-tight">
              Unlock Your <br />
              <span className="text-blue-600">Enterprise</span> Future.
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed">
              Join over 5,000 corporate partners streamlining their digital operations with our precision-engineered toolset.
            </p>
          </div>

          <div className="flex flex-col gap-6 p-8 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="size-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-slate-900">Secure Infrastructure</p>
                <p className="text-sm text-slate-600">Military-grade encryption for all financial data.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="size-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                <Rocket className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-slate-900">Instant Approval</p>
                <p className="text-sm text-slate-600">Automated GST verification for faster access.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Form Content */}
      <div className="w-full lg:w-7/12 flex flex-col justify-center">
        <OnboardCard step={1} title="Company Registration">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Legal Company Name" placeholder="Global Tech Corp" />
            <Input
              label="GST Number"
              placeholder="22AAAAA0000A1Z5"
              icon={<ScanLine className="w-5 h-5" />}
              iconPosition="right"
            />
          </div>

          <Input
            label="Official Email Address"
            placeholder="admin@company.com"
            type="email"
            icon={<Mail className="w-5 h-5" />}
            iconPosition="right"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-[11px] font-bold text-slate-500 tracking-wide px-1 uppercase select-none">
                Account Password
              </label>
              <div className="relative w-full flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  style={{ paddingLeft: '1rem', paddingRight: '2.75rem' }}
                  className="w-full h-[52px] bg-slate-100 rounded-xl text-sm outline-none transition-all placeholder:text-slate-400 text-slate-900 border border-transparent focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/40 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <Input
              label="Contact Number"
              placeholder="+1 (555) 000-0000"
              icon={<Smartphone className="w-5 h-5" />}
              iconPosition="right"
            />
          </div>

          <p className="flex items-center gap-1.5 text-xs text-slate-500 -mt-2 px-1">
            <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            Password must contain at least 12 characters, including one symbol.
          </p>

          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 w-4 h-4 cursor-pointer accent-blue-600"
            />
            <span className="text-sm text-slate-600 leading-relaxed">
              I agree to the{' '}
              <Link href="#" className="font-semibold text-blue-600 hover:underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="#" className="font-semibold text-blue-600 hover:underline">
                Privacy Policy
              </Link>{' '}
              regarding corporate data handling.
            </span>
          </label>

          <div className="flex flex-col gap-3">
            <label className="text-[11px] font-bold text-slate-500 tracking-wide px-1 uppercase select-none">
              Select Your Role
            </label>
            <div className="grid grid-cols-3 gap-3">
              {ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-3.5 text-sm font-medium transition-all ${
                    role === r
                      ? 'bg-blue-50 border border-blue-500 text-blue-700'
                      : 'bg-slate-100 border border-transparent text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span
                    className={`shrink-0 size-4 rounded-full border-2 flex items-center justify-center ${
                      role === r ? 'border-blue-600' : 'border-slate-400'
                    }`}
                  >
                    {role === r && <span className="size-2 rounded-full bg-blue-600" />}
                  </span>
                  {r}
                </button>
              ))}
            </div>
          </div>

          <Link
            href="/onboard/step-2"
            className="mt-2 flex w-full justify-center rounded-xl bg-blue-600 px-3 py-4 text-sm font-semibold text-white hover:bg-blue-500 shadow-lg shadow-blue-200 transition-colors"
          >
            Continue
          </Link>

          <p className="text-center text-sm text-slate-500">
            Already registered?{' '}
            <Link href="#" className="font-semibold text-blue-600 hover:underline">
              Sign in to portal
            </Link>
          </p>
        </OnboardCard>
      </div>
    </div>
  );
}
