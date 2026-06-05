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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">UK Retirement Planner</h1>
            <p className="text-xs text-gray-500">2025/26 tax year · No data stored</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Intro */}
        <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-5">
          <h2 className="font-semibold text-indigo-900 mb-1">Find out if you can retire</h2>
          <p className="text-sm text-indigo-700 leading-relaxed">
            Fill in your details below to see if you&apos;re on track. The planner models pension
            drawdown, ISA and LISA rules, UK income tax, capital gains tax, and the state pension —
            all using 2025/26 UK tax bands. No data leaves your browser.
          </p>
        </div>

        {/* Form */}
        <RetirementForm onCalculate={handleCalculate} />

        {/* Results */}
        {results && inputs && (
          <div ref={resultsRef} className="pt-4 border-t-2 border-indigo-200">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Your results</h2>
            <RetirementResultsComponent results={results} inputs={inputs} />
          </div>
        )}
      </main>

      <footer className="max-w-3xl mx-auto px-4 py-8 text-center text-xs text-gray-400">
        Not financial advice. Figures are estimates based on real returns and current UK tax rules.
      </footer>
    </div>
  );
}
