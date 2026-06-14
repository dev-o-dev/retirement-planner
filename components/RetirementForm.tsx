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
  const retirementHorizon = 100 - inputs.retirementAge;

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* About You */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <SectionHeader
          title="About You"
          subtitle="These two ages set your time horizon — how long your money has to grow, and how long it needs to last."
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
            {retirementHorizon > 0 && (
              <>
                {" "}— followed by up to {retirementHorizon} year{retirementHorizon !== 1 ? "s" : ""} in
                retirement (we project to age 100).
              </>
            )}
          </p>
        )}
      </div>

      {/* Current Portfolio */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <SectionHeader
          title="Current Portfolio"
          subtitle="Enter today's balances. We'll grow each pot using your assumptions below and apply UK rules for ISAs, LISAs, and pensions automatically."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CurrencyInput id="cash" label="Cash savings" value={inputs.portfolio.cash} onChange={(v) => setPortfolio("cash", v)} hint="Easy-access savings, fixed-term bonds, Premium Bonds, and cash ISAs. Your most flexible pot — no tax due on withdrawal." />
          <CurrencyInput id="pension" label="Pension (DC / SIPP)" value={inputs.portfolio.pension} onChange={(v) => setPortfolio("pension", v)} hint="Workplace defined contribution pensions and personal pensions/SIPPs. Final salary (defined benefit) pensions aren't modelled — if you have one, treat it as extra guaranteed income alongside your State Pension." />
          <CurrencyInput id="isa" label="Stocks & Shares ISA" value={inputs.portfolio.isa} onChange={(v) => setPortfolio("isa", v)} hint="Grows tax-free and can be withdrawn completely tax-free, at any age." />
          <CurrencyInput id="lisa" label="Lifetime ISA (LISA)" value={inputs.portfolio.lisa} onChange={(v) => setPortfolio("lisa", v)} hint="Tax-free growth plus a 25% government top-up while you're contributing (up to age 50). Withdrawals before age 60 — other than to buy a first home — incur a 25% government penalty." />
          <CurrencyInput id="gia" label="General Investment Account (GIA)" value={inputs.portfolio.gia} onChange={(v) => setPortfolio("gia", v)} hint="Held outside a tax wrapper. When you sell, gains above the £3,000 annual exempt amount are taxed at 18% (basic rate) or 24% (higher rate)." />
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
                hint="We'll assume this is repaid at retirement — from your cash first, then ISA, GIA, and pension if needed — reducing your pot before drawdown begins."
              />
            </div>
          )}
        </div>
      </div>

      {/* Annual Contributions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <SectionHeader
          title="Annual Contributions"
          subtitle={`How much you'll add to each pot every year, in today's money, until you retire at ${inputs.retirementAge}. We'll apply growth, LISA bonuses, and contribution limits automatically.`}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CurrencyInput id="contrib-cash" label="Cash savings" value={inputs.contributions.cash} onChange={(v) => setContributions("cash", v)} hint="Per year, in today's money." />
          <CurrencyInput id="contrib-pension" label="Pension (gross)" value={inputs.contributions.pension} onChange={(v) => setContributions("pension", v)} hint="The total going in each year — your contributions plus employer contributions and tax relief. The pension annual allowance is £60,000/year." />
          <CurrencyInput id="contrib-isa" label="Stocks & Shares ISA" value={inputs.contributions.isa} onChange={(v) => setContributions("isa", v)} hint="Counts towards your £20,000/year combined ISA allowance (Stocks & Shares ISA + Lifetime ISA + Cash ISA)." />
          <CurrencyInput
            id="contrib-lisa"
            label="Lifetime ISA"
            value={inputs.contributions.lisa}
            onChange={(v) => setContributions("lisa", v)}
            hint={`Counts towards your £20,000 ISA allowance. The government adds a 25% bonus on contributions up to £4,000/year (max £1,000/year bonus) until your ${TAX.lisaMaxContributionAge}th birthday. You must open a LISA before turning 40.`}
          />
          <CurrencyInput id="contrib-gia" label="GIA" value={inputs.contributions.gia} onChange={(v) => setContributions("gia", v)} hint="Per year, in today's money. Usually only worth using once you're already putting £20,000/year into ISAs." />
        </div>
      </div>

      {/* State Pension */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <SectionHeader
          title="State Pension"
          subtitle="The State Pension is a flat-rate government pension, separate from your own savings. Most people need 35 qualifying years of National Insurance contributions for the full amount."
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
              hint={`The full new State Pension for 2025/26 is £${TAX.fullStatePension.toLocaleString()}/year (£221.20/week). Gaps in your National Insurance record can reduce this — check your forecast on the gov.uk State Pension forecast service.`}
            />
            <NumberInput
              id="statePensionAge"
              label="State pension age"
              value={inputs.statePensionAge}
              onChange={(v) => set("statePensionAge", v)}
              min={60}
              max={75}
              suffix="yrs"
              hint="Currently 66, rising to 67 by 2028 and 68 by 2046. The exact age depends on your date of birth — check yours on gov.uk."
            />
          </div>
        )}
      </div>

      {/* Retirement Spending */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <SectionHeader
          title="Retirement Spending"
          subtitle="The amount you want to have available to spend, after any tax, each year — in today's money. This is the number the whole plan is built around."
        />
        <div className="max-w-sm">
          <CurrencyInput
            id="targetSpending"
            label="Target annual spending (post-tax)"
            value={inputs.targetAnnualSpending}
            onChange={(v) => set("targetAnnualSpending", v)}
            hint="For reference, the PLSA's 2025 Retirement Living Standards for a one-person household are roughly £13,400/year (minimum), £31,700/year (moderate), and £43,900/year (comfortable)."
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
            <p className="text-sm text-gray-500 mt-4">
              These settings drive every projection below. The defaults are sensible starting
              points, but you can stress-test your plan by adjusting them.
            </p>
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
                hint="The percentage of your portfolio you withdraw in your first year of retirement (then increase with inflation each year after). 4% comes from US research (the 'Trinity Study') on portfolios lasting 30+ years; some planners now suggest 3-3.5% for extra safety."
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
                hint="Your investment growth rate after subtracting inflation. Globally diversified equities have historically returned around 4-5% real over the long term; a more cautious, bond-heavy portfolio might be closer to 1-2%."
              />
              <NumberInput
                id="pensionAccess"
                label="Pension access age"
                value={inputs.pensionAccessAge}
                onChange={(v) => set("pensionAccessAge", v)}
                min={50}
                max={65}
                suffix="yrs"
                hint="Known as the 'Normal Minimum Pension Age'. Currently 55, rising to 57 from 6 April 2028. It has historically stayed 10 years below State Pension age, so it may rise further in future."
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
