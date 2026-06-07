"use client";

import { useState } from "react";
import { RetirementInputs } from "@/lib/types";
import { TAX } from "@/lib/tax";

interface Props {
  onCalculate: (inputs: RetirementInputs) => void;
}

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";

function FieldLabel({ htmlFor, label, hint }: { htmlFor: string; label: string; hint?: string }) {
  return (
    <>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700 mb-1">
        {label}
      </label>
      {hint && <p className="text-xs text-slate-500 mb-1.5 leading-snug">{hint}</p>}
    </>
  );
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
      <FieldLabel htmlFor={id} label={label} hint={hint} />
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <span className="text-slate-400 text-sm">£</span>
        </div>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={raw}
          onChange={handleChange}
          onFocus={(e) => e.target.select()}
          placeholder="0"
          className={`${inputClass} tnum pl-7 pr-3 py-2.5`}
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
  const [raw, setRaw] = useState(String(value));

  // Keep the displayed text in sync when the value changes from outside
  // (e.g. retirement age being clamped to current age + 1).
  if (raw !== "" && parseFloat(raw) !== value) {
    setRaw(String(value));
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setRaw(v);
    const n = parseFloat(v);
    if (!isNaN(n)) onChange(n);
  };

  return (
    <div>
      <FieldLabel htmlFor={id} label={label} hint={hint} />
      <div className="relative">
        <input
          id={id}
          type="number"
          value={raw}
          onChange={handleChange}
          onFocus={(e) => e.target.select()}
          onBlur={() => raw === "" && setRaw(String(value))}
          min={min}
          max={max}
          step={step ?? 1}
          className={`${inputClass} tnum px-3 py-2.5 ${suffix ? "pr-12" : ""}`}
        />
        {suffix && (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <span className="text-slate-400 text-sm">{suffix}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function SelectInput<T extends string>({
  label,
  value,
  onChange,
  options,
  hint,
  id,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  hint?: string;
  id: string;
}) {
  return (
    <div>
      <FieldLabel htmlFor={id} label={label} hint={hint} />
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
          className={`${inputClass} appearance-none px-3 py-2.5 pr-9 cursor-pointer`}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

const defaultInputs: RetirementInputs = {
  currentAge: 35,
  retirementAge: 60,
  portfolio: { cash: 10000, pension: 50000, isa: 20000, lisa: 5000, gia: 0 },
  hasMortgage: false,
  mortgageRemaining: 0,
  mortgagePayoffAge: 60,
  mortgagePayoffSource: "cash",
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* About You */}
      <Card title="About you" subtitle="Basic details about your timeline">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-indigo-50 px-3.5 py-2.5 text-sm text-indigo-700">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              <span className="font-semibold tnum">{yearsToRetirement}</span> year
              {yearsToRetirement !== 1 ? "s" : ""} until your target retirement age
            </span>
          </div>
        )}
      </Card>

      {/* Current Portfolio */}
      <Card title="Current portfolio" subtitle="Your savings and investments today">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <CurrencyInput id="cash" label="Cash savings" value={inputs.portfolio.cash} onChange={(v) => setPortfolio("cash", v)} hint="ISA, premium bonds, savings accounts" />
          <CurrencyInput id="pension" label="Pension (DC / SIPP)" value={inputs.portfolio.pension} onChange={(v) => setPortfolio("pension", v)} hint="Defined contribution or SIPP pot value" />
          <CurrencyInput id="isa" label="Stocks & Shares ISA" value={inputs.portfolio.isa} onChange={(v) => setPortfolio("isa", v)} />
          <CurrencyInput id="lisa" label="Lifetime ISA (LISA)" value={inputs.portfolio.lisa} onChange={(v) => setPortfolio("lisa", v)} hint="Accessible penalty-free from age 60" />
          <CurrencyInput id="gia" label="General Investment Account (GIA)" value={inputs.portfolio.gia} onChange={(v) => setPortfolio("gia", v)} hint="Subject to capital gains tax on withdrawal" />
        </div>

        {/* Mortgage */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <label htmlFor="hasMortgage" className="flex items-center gap-3 cursor-pointer">
            <input
              id="hasMortgage"
              type="checkbox"
              checked={inputs.hasMortgage}
              onChange={(e) => set("hasMortgage", e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm font-medium text-slate-700">I have an outstanding mortgage</span>
          </label>
          {inputs.hasMortgage && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-5">
              <CurrencyInput
                id="mortgageRemaining"
                label="Remaining balance"
                value={inputs.mortgageRemaining}
                onChange={(v) => set("mortgageRemaining", v)}
                hint="Outstanding at retirement"
              />
              <NumberInput
                id="mortgagePayoffAge"
                label="Pay off at age"
                value={inputs.mortgagePayoffAge}
                onChange={(v) => set("mortgagePayoffAge", v)}
                min={inputs.retirementAge}
                max={100}
                suffix="yrs"
                hint={`On/after retirement (${inputs.retirementAge})`}
              />
              <SelectInput
                id="mortgagePayoffSource"
                label="Pay off from"
                value={inputs.mortgagePayoffSource}
                onChange={(v) => set("mortgagePayoffSource", v)}
                options={[
                  { value: "cash", label: "Cash savings" },
                  { value: "isa", label: "Stocks & Shares ISA" },
                  { value: "pension", label: "Pension (25% tax-free)" },
                ]}
                hint="Pot used first; overflows if short"
              />
            </div>
          )}
          {inputs.hasMortgage && inputs.mortgagePayoffSource === "pension" && (
            <p className="mt-3 text-xs text-slate-500 leading-snug">
              Drawn as a pension lump sum: 25% tax-free, the rest taxed as income. Only available once your
              pension is accessible (age {inputs.pensionAccessAge}).
            </p>
          )}
        </div>
      </Card>

      {/* Annual Contributions */}
      <Card title="Annual contributions" subtitle={`How much you'll invest each year until age ${inputs.retirementAge}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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
      </Card>

      {/* State Pension */}
      <Card title="State pension" subtitle="UK new state pension from age 68">
        <label htmlFor="statePension" className="flex items-center gap-3 mb-5 cursor-pointer">
          <input
            id="statePension"
            type="checkbox"
            checked={inputs.eligibleForStatePension}
            onChange={(e) => set("eligibleForStatePension", e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-sm font-medium text-slate-700">I expect to receive the UK State Pension</span>
        </label>
        {inputs.eligibleForStatePension && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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
      </Card>

      {/* Retirement Spending */}
      <Card title="Retirement spending" subtitle="How much you want to spend each year in retirement">
        <div className="max-w-sm">
          <CurrencyInput
            id="targetSpending"
            label="Target annual spending (post-tax)"
            value={inputs.targetAnnualSpending}
            onChange={(v) => set("targetAnnualSpending", v)}
            hint="The PLSA recommends £37,000/year for a 'comfortable' retirement for one person"
          />
        </div>
      </Card>

      {/* Advanced / Assumptions */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between px-6 sm:px-7 py-4 text-left hover:bg-slate-50 transition-colors"
        >
          <div>
            <span className="text-base font-semibold tracking-tight text-slate-900">Assumptions</span>
            <span className="ml-2 text-sm text-slate-400 tnum">
              SWR {(inputs.swr * 100).toFixed(1)}% · real return {(inputs.realReturnRate * 100).toFixed(1)}%
            </span>
          </div>
          <svg
            className={`w-5 h-5 text-slate-400 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showAdvanced && (
          <div className="px-6 sm:px-7 pb-6 border-t border-slate-100">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-5">
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
        className="group w-full rounded-xl bg-indigo-600 text-white font-semibold py-3.5 px-6 text-base shadow-sm shadow-indigo-600/20 hover:bg-indigo-700 active:bg-indigo-800 transition-colors flex items-center justify-center gap-2"
      >
        Calculate my retirement
        <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </button>
    </form>
  );
}
