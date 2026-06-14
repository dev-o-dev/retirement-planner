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
            Answer a few questions about your savings, investments, and spending plans, and
            we&apos;ll project your finances from today through to age 100 — all in today&apos;s
            money (adjusted for inflation). The planner will show you:
          </p>
          <ul className="text-sm text-indigo-700 leading-relaxed list-disc list-inside mt-2 space-y-1">
            <li>How your pots grow until retirement, including the Lifetime ISA bonus</li>
            <li>How you&apos;d draw down tax-efficiently — ISA first, then your pension, then taxable accounts</li>
            <li>Whether you can bridge the gap if you retire before you can access your pension or State Pension</li>
          </ul>
          <p className="text-sm text-indigo-700 leading-relaxed mt-2">
            Everything runs in your browser — nothing is saved or sent anywhere.
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

      <footer className="max-w-3xl mx-auto px-4 py-8 text-center text-xs text-gray-400 leading-relaxed">
        This tool provides estimates only and is not financial advice. It assumes 2025/26 tax
        rules, allowances, and access ages remain unchanged for the rest of your life, which in
        reality they won&apos;t. For advice tailored to your circumstances, speak to a regulated
        financial adviser or use MoneyHelper&apos;s free guidance service.
      </footer>
    </div>
  );
}
