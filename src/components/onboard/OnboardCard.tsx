import React from 'react';
import { Lock, ShieldCheck, Globe, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface OnboardCardProps {
  step: number;
  title: string;
  children: React.ReactNode;
}

export function OnboardCard({ step, title, children }: OnboardCardProps) {
  const steps = ['Details', 'Verification', 'Address', 'Authorized', 'Finalize'];
  
  return (
    <div className="bg-slate-50 text-slate-900 min-h-[calc(100vh-4rem)] flex flex-col items-center py-12 px-6">
      
      {/* Centered Narrow Wrapper */}
      <div className="w-full max-w-[560px] flex flex-col gap-8">
        
        {/* Back Button & Logo */}
        <div className="flex items-center justify-between mb-4">
          {step > 1 ? (
            <Link href={`/onboard/step-${step - 1}`} className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span className="font-semibold text-sm">Back</span>
            </Link>
          ) : (
            <span />
          )}
          <div className="size-8 text-blue-600">
            <svg fill="currentColor" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
            </svg>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-10 flex flex-col gap-8 border border-slate-200">
          
          {/* Multi-Step Progress */}
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <div className="space-y-1">
                <p className="text-xs font-bold text-blue-600 uppercase tracking-[0.1em]">Step 0{step} / 05</p>
                <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
              </div>
              <p className="text-sm font-medium text-slate-500">{step * 20}% Complete</p>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-600 rounded-full transition-all duration-500" 
                style={{ width: `${step * 20}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase tracking-widest px-1">
              {steps.map((s, i) => (
                <span key={s} className={i + 1 <= step ? 'text-blue-600' : ''}>{s}</span>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex flex-col gap-6">
            {children}
          </div>

          {/* Footer Meta */}
          <div className="mt-8 flex justify-center gap-8 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            <span className="flex items-center gap-1">
              <Lock className="w-3.5 h-3.5" />
              SSL SECURED
            </span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              GDPR COMPLIANT
            </span>
            <span className="flex items-center gap-1">
              <Globe className="w-3.5 h-3.5" />
              GLOBAL REGISTRATION
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
