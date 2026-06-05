"use client";

import { useState } from "react";
import { RetirementInputs } from "@/lib/types";
import { TAX } from "@/lib/tax";

interface Props {
  onCalculate: (inputs: RetirementInputs) => void;
}

function CurrencyInput({
  label,
  value,
  onChange,
  hint,
  id,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
  id: string;
}) {
  const [raw, setRaw] = useState(value === 0 ? "" : String(value));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/[^0-9.]/g, "");
    setRaw(v);
    const n = parseFloat(v);
    onChange(isNaN(n) ? 0 : n);
  };

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      {hint && <p className="text-xs text-gray-500 mb-1">{hint}</p>}
      <div className="relative rounded-md shadow-sm">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <span className="text-gray-500 text-sm">£</span>
        </div>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={raw}
          onChange={handleChange}
          onFocus={(e) => e.target.select()}
          placeholder="0"
          className="block w-full rounded-md border border-gray-300 pl-7 pr-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  step,
  suffix,
  hint,
  id,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  hint?: string;
  id: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      {hint && <p className="text-xs text-gray-500 mb-1">{hint}</p>}
      <div className="relative rounded-md shadow-sm">
        <input
          id={id}
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          min={min}
          max={max}
          step={step ?? 1}
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        {suffix && (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <span className="text-gray-500 text-sm">{suffix}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
  );
}

const defaultInputs: RetirementInputs = {
  currentAge: 35,
  retirementAge: 60,
  portfolio: { cash: 10000, pension: 50000, isa: 20000, lisa: 5000, gia: 0 },
  hasMortgage: false,
  mortgageRemaining: 0,
  contributions: { cash: 0, pension: 6000, isa: 10000, lisa: 4000, gia: 0 },
  eligibleForStatePension: true,
  statePensionAnnual: TAX.fullStatePension,
  statePensionAge: 68,
  targetAnnualSpending: 30000,
  realReturnRate: 0.04,
  swr: 0.04,
  pensionAccessAge: TAX.pensionAccessAge,
};

export default function RetirementForm({ onCalculate }: Props) {
  const [inputs, setInputs] = useState<RetirementInputs>(defaultInputs);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const set = <K extends keyof RetirementInputs>(key: K, value: RetirementInputs[K]) =>
    setInputs((prev) => ({ ...prev, [key]: value }));

  const setPortfolio = (key: keyof RetirementInputs["portfolio"], value: number) =>
    setInputs((prev) => ({ ...prev, portfolio: { ...prev.portfolio, [key]: value } }));

  const setContributions = (key: keyof RetirementInputs["contributions"], value: number) =>
    setInputs((prev) => ({ ...prev, contributions: { ...prev.contributions, [key]: value } }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCalculate(inputs);
  };

  const yearsToRetirement = inputs.retirementAge - inputs.currentAge;

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* About You */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <SectionHeader
          title="About You"
          subtitle="Basic details about your timeline"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <NumberInput
            id="currentAge"
            label="Current age"
            value={inputs.currentAge}
            onChange={(v) => set("currentAge", v)}
            min={18}
            max={80}
            suffix="yrs"
          />
          <NumberInput
            id="retirementAge"
            label="Target retirement age"
            value={inputs.retirementAge}
            onChange={(v) => set("retirementAge", v)}
            min={inputs.currentAge + 1}
            max={80}
            suffix="yrs"
          />
        </div>
        {yearsToRetirement > 0 && (
          <p className="mt-3 text-sm text-indigo-600 font-medium">
            {yearsToRetirement} year{yearsToRetirement !== 1 ? "s" : ""} until your target retirement age
          </p>
        )}
      </div>

      {/* Current Portfolio */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <SectionHeader
          title="Current Portfolio"
          subtitle="Your savings and investments today"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CurrencyInput id="cash" label="Cash savings" value={inputs.portfolio.cash} onChange={(v) => setPortfolio("cash", v)} hint="ISA, premium bonds, savings accounts" />
          <CurrencyInput id="pension" label="Pension (DC / SIPP)" value={inputs.portfolio.pension} onChange={(v) => setPortfolio("pension", v)} hint="Defined contribution or SIPP pot value" />
          <CurrencyInput id="isa" label="Stocks & Shares ISA" value={inputs.portfolio.isa} onChange={(v) => setPortfolio("isa", v)} />
          <CurrencyInput id="lisa" label="Lifetime ISA (LISA)" value={inputs.portfolio.lisa} onChange={(v) => setPortfolio("lisa", v)} hint="Accessible penalty-free from age 60" />
          <CurrencyInput id="gia" label="General Investment Account (GIA)" value={inputs.portfolio.gia} onChange={(v) => setPortfolio("gia", v)} hint="Subject to capital gains tax on withdrawal" />
        </div>

        {/* Mortgage */}
        <div className="mt-5 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <input
              id="hasMortgage"
              type="checkbox"
              checked={inputs.hasMortgage}
              onChange={(e) => set("hasMortgage", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="hasMortgage" className="text-sm font-medium text-gray-700">
              I have an outstanding mortgage
            </label>
          </div>
          {inputs.hasMortgage && (
            <div className="mt-3 max-w-xs">
              <CurrencyInput
                id="mortgageRemaining"
                label="Remaining mortgage balance"
                value={inputs.mortgageRemaining}
                onChange={(v) => set("mortgageRemaining", v)}
                hint="This will be deducted from your cash at retirement"
              />
            </div>
          )}
        </div>
      </div>

      {/* Annual Contributions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <SectionHeader
          title="Annual Contributions"
          subtitle={`How much you'll invest each year until age ${inputs.retirementAge}`}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CurrencyInput id="contrib-cash" label="Cash savings" value={inputs.contributions.cash} onChange={(v) => setContributions("cash", v)} hint="Per year" />
          <CurrencyInput id="contrib-pension" label="Pension (gross)" value={inputs.contributions.pension} onChange={(v) => setContributions("pension", v)} hint="Including employer contributions and tax relief" />
          <CurrencyInput id="contrib-isa" label="Stocks & Shares ISA" value={inputs.contributions.isa} onChange={(v) => setContributions("isa", v)} hint="Max £20,000/year combined ISA limit" />
          <CurrencyInput
            id="contrib-lisa"
            label="Lifetime ISA"
            value={inputs.contributions.lisa}
            onChange={(v) => setContributions("lisa", v)}
            hint={`Max £4,000/year. Gov adds 25% bonus = up to £1,000 free. Contributions until age ${TAX.lisaMaxContributionAge}.`}
          />
          <CurrencyInput id="contrib-gia" label="GIA" value={inputs.contributions.gia} onChange={(v) => setContributions("gia", v)} hint="Per year" />
        </div>
      </div>

      {/* State Pension */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <SectionHeader
          title="State Pension"
          subtitle="UK new state pension from age 68"
        />
        <div className="flex items-center gap-3 mb-4">
          <input
            id="statePension"
            type="checkbox"
            checked={inputs.eligibleForStatePension}
            onChange={(e) => set("eligibleForStatePension", e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <label htmlFor="statePension" className="text-sm font-medium text-gray-700">
            I expect to receive the UK State Pension
          </label>
        </div>
        {inputs.eligibleForStatePension && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CurrencyInput
              id="statePensionAmount"
              label="Expected state pension (gross, per year)"
              value={inputs.statePensionAnnual}
              onChange={(v) => set("statePensionAnnual", v)}
              hint={`Full new state pension 2025/26 is £${TAX.fullStatePension.toLocaleString()}/year`}
            />
            <NumberInput
              id="statePensionAge"
              label="State pension age"
              value={inputs.statePensionAge}
              onChange={(v) => set("statePensionAge", v)}
              min={60}
              max={75}
              suffix="yrs"
              hint="Currently 66–68 depending on birth year"
            />
          </div>
        )}
      </div>

      {/* Retirement Spending */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <SectionHeader
          title="Retirement Spending"
          subtitle="How much you want to spend each year in retirement"
        />
        <div className="max-w-sm">
          <CurrencyInput
            id="targetSpending"
            label="Target annual spending (post-tax)"
            value={inputs.targetAnnualSpending}
            onChange={(v) => set("targetAnnualSpending", v)}
            hint="The PLSA recommends £37,000/year for a 'comfortable' retirement for one person"
          />
        </div>
      </div>

      {/* Advanced / Assumptions */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
        >
          <div>
            <span className="text-base font-semibold text-gray-900">Assumptions</span>
            <span className="ml-2 text-sm text-gray-500">
              (SWR {(inputs.swr * 100).toFixed(1)}%, real return {(inputs.realReturnRate * 100).toFixed(1)}%)
            </span>
          </div>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showAdvanced && (
          <div className="px-6 pb-6 border-t border-gray-100">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <NumberInput
                id="swr"
                label="Safe withdrawal rate (SWR)"
                value={inputs.swr * 100}
                onChange={(v) => set("swr", v / 100)}
                min={1}
                max={10}
                step={0.1}
                suffix="%"
                hint="Classic 4% rule. Higher = more aggressive."
              />
              <NumberInput
                id="realReturn"
                label="Annual real return"
                value={inputs.realReturnRate * 100}
                onChange={(v) => set("realReturnRate", v / 100)}
                min={0}
                max={15}
                step={0.1}
                suffix="%"
                hint="Inflation-adjusted. 4% is a common assumption."
              />
              <NumberInput
                id="pensionAccess"
                label="Pension access age"
                value={inputs.pensionAccessAge}
                onChange={(v) => set("pensionAccessAge", v)}
                min={50}
                max={65}
                suffix="yrs"
                hint="Minimum pension access age (rising to 57 in 2028)"
              />
            </div>
          </div>
        )}
      </div>

      <button
        type="submit"
        className="w-full bg-indigo-600 text-white font-semibold py-3 px-6 rounded-xl hover:bg-indigo-700 active:bg-indigo-800 transition-colors shadow-sm text-base"
      >
        Calculate my retirement
      </button>
    </form>
  );
}
