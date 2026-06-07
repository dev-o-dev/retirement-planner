"use client";

import { useState, useRef } from "react";
import RetirementForm from "@/components/RetirementForm";
import RetirementResultsComponent from "@/components/RetirementResults";
import { RetirementInputs, RetirementResults } from "@/lib/types";
import { calculateRetirement } from "@/lib/calculations";

export default function Home() {
  const [results, setResults] = useState<RetirementResults | null>(null);
  const [inputs, setInputs] = useState<RetirementInputs | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const handleCalculate = (formInputs: RetirementInputs) => {
    const r = calculateRetirement(formInputs);
    setResults(r);
    setInputs(formInputs);
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-5 py-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-sm shadow-indigo-600/20">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-[15px] font-semibold text-slate-900 leading-tight tracking-tight">UK Retirement Planner</h1>
            <p className="text-xs text-slate-500">2025/26 tax year · Nothing leaves your browser</p>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="relative overflow-hidden border-b border-slate-200 bg-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(60% 120% at 80% -10%, rgba(99,102,241,0.10), transparent 60%), radial-gradient(50% 100% at 0% 0%, rgba(16,185,129,0.07), transparent 55%)",
          }}
        />
        <div className="relative max-w-3xl mx-auto px-5 py-12 sm:py-14">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Private &amp; free · runs entirely on your device
          </span>
          <h2 className="mt-4 text-3xl sm:text-[2.6rem] font-bold tracking-tight text-slate-900 leading-[1.1]">
            Find out if you can <span className="text-indigo-600">retire</span>.
          </h2>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-slate-600">
            Fill in your details below to see if you&apos;re on track. The planner models pension drawdown,
            ISA and LISA rules, UK income tax, capital gains tax, and the state pension — all using 2025/26
            UK tax bands.
          </p>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-5 py-10">
        {/* Form */}
        <RetirementForm onCalculate={handleCalculate} />

        {/* Results */}
        {results && inputs && (
          <div ref={resultsRef} className="mt-12 pt-10 border-t border-slate-200 scroll-mt-20 animate-in">
            <div className="flex items-baseline justify-between mb-6 flex-wrap gap-2">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">Your results</h2>
              <span className="text-xs font-medium text-slate-400">Real (inflation-adjusted) terms</span>
            </div>
            <RetirementResultsComponent results={results} inputs={inputs} />
          </div>
        )}
      </main>

      <footer className="mt-4 border-t border-slate-200">
        <div className="max-w-3xl mx-auto px-5 py-8 text-center text-xs text-slate-400">
          Not financial advice. Figures are estimates based on real returns and current UK tax rules.
        </div>
      </footer>
    </div>
  );
}
