"use client";

import { RetirementResults, RetirementInputs } from "@/lib/types";
import DrawdownChart from "./DrawdownChart";

interface Props {
  results: RetirementResults;
  inputs: RetirementInputs;
}

function fmt(n: number, decimals = 0): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

function StatCard({ label, value, sub, color = "gray" }: { label: string; value: string; sub?: string; color?: "green" | "red" | "amber" | "indigo" | "gray" }) {
  const colorMap = {
    green: "text-emerald-700 bg-emerald-50 border-emerald-200",
    red: "text-red-700 bg-red-50 border-red-200",
    amber: "text-amber-700 bg-amber-50 border-amber-200",
    indigo: "text-indigo-700 bg-indigo-50 border-indigo-200",
    gray: "text-gray-700 bg-gray-50 border-gray-200",
  };
  return (
    <div className={`rounded-lg border p-4 ${colorMap[color]}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-70 mb-1">{label}</p>
      <p className="text-xl font-bold">{value}</p>
      {sub && <p className="text-xs mt-1 opacity-70">{sub}</p>}
    </div>
  );
}

export default function RetirementResultsComponent({ results, inputs }: Props) {
  const {
    canRetire,
    portfolioAtRetirement,
    portfolioValueAtRetirement,
    swrIncomeAtRetirement,
    shortfallAtRetirement,
    needsBridge,
    bridgeYears,
    canBridgeGap,
    lisaPenaltyWarning,
    drawdownYears,
    portfolioExhaustedAge,
    ageCanRetire,
  } = results;

  const allGood = canRetire && (!needsBridge || canBridgeGap);
  const totalAtRetirement = portfolioValueAtRetirement;

  const pots = [
    { label: "Pension (DC/SIPP)", value: portfolioAtRetirement.pension, color: "bg-indigo-500", note: "Accessible from age " + inputs.pensionAccessAge },
    { label: "Stocks & Shares ISA", value: portfolioAtRetirement.isa, color: "bg-emerald-500", note: "Tax-free withdrawals" },
    { label: "Lifetime ISA", value: portfolioAtRetirement.lisa, color: "bg-lime-500", note: "Tax-free from age 60" },
    { label: "Cash", value: portfolioAtRetirement.cash, color: "bg-amber-500", note: "No tax on withdrawals" },
    { label: "GIA", value: portfolioAtRetirement.gia, color: "bg-orange-500", note: "CGT on gains" },
  ].filter((p) => p.value > 0);

  return (
    <div className="space-y-6">
      {/* Verdict banner */}
      <div
        className={`rounded-2xl p-6 border-2 ${
          allGood
            ? "bg-emerald-50 border-emerald-300"
            : canRetire && needsBridge && !canBridgeGap
            ? "bg-amber-50 border-amber-300"
            : "bg-red-50 border-red-300"
        }`}
      >
        <div className="flex items-start gap-4">
          <div
            className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
              allGood ? "bg-emerald-200" : canRetire ? "bg-amber-200" : "bg-red-200"
            }`}
          >
            {allGood ? "✓" : canRetire ? "⚠" : "✗"}
          </div>
          <div>
            <h2
              className={`text-2xl font-bold mb-1 ${
                allGood ? "text-emerald-800" : canRetire ? "text-amber-800" : "text-red-800"
              }`}
            >
              {allGood
                ? "You're on track to retire at " + inputs.retirementAge
                : canRetire && needsBridge && !canBridgeGap
                ? "Portfolio sufficient, but bridge gap is a problem"
                : "Not yet ready to retire at " + inputs.retirementAge}
            </h2>
            <p
              className={`text-sm ${
                allGood ? "text-emerald-700" : canRetire ? "text-amber-700" : "text-red-700"
              }`}
            >
              {allGood ? (
                <>
                  At {(inputs.swr * 100).toFixed(0)}% SWR, your projected portfolio of{" "}
                  <strong>{fmt(totalAtRetirement)}</strong> can sustain{" "}
                  <strong>{fmt(swrIncomeAtRetirement)}/year</strong> — exceeding your{" "}
                  {fmt(inputs.targetAnnualSpending)} target.
                </>
              ) : canRetire && needsBridge && !canBridgeGap ? (
                <>
                  Your overall portfolio is large enough, but you retire at {inputs.retirementAge} —
                  before pension access at {inputs.pensionAccessAge}. Your non-pension assets aren't
                  enough to cover the {bridgeYears}-year bridge gap.
                </>
              ) : (
                <>
                  At {(inputs.swr * 100).toFixed(0)}% SWR your portfolio would generate{" "}
                  <strong>{fmt(swrIncomeAtRetirement)}/year</strong>, a shortfall of{" "}
                  <strong>{fmt(shortfallAtRetirement)}/year</strong> against your{" "}
                  {fmt(inputs.targetAnnualSpending)} target.
                  {ageCanRetire !== null && (
                    <> On your current trajectory you could retire at age <strong>{ageCanRetire}</strong>.</>
                  )}
                  {ageCanRetire === null && " Consider increasing contributions or reducing your spending target."}
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Warnings */}
      {lisaPenaltyWarning && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
          <strong>LISA penalty warning:</strong> You retire at {inputs.retirementAge}, before the
          LISA penalty-free access age of 60. Withdrawing your LISA early incurs a 25% government
          penalty (you lose the bonus and ~6.25% of your own contributions). The planner avoids
          drawing from your LISA until age 60 where possible.
        </div>
      )}

      {needsBridge && (
        <div
          className={`rounded-xl border p-4 text-sm ${
            canBridgeGap
              ? "bg-indigo-50 border-indigo-200 text-indigo-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          <strong>Bridge gap ({bridgeYears} years):</strong> You retire at {inputs.retirementAge},
          before pension access at {inputs.pensionAccessAge}.{" "}
          {canBridgeGap
            ? `Your ISA, cash, and GIA are sufficient to cover this gap without touching your pension.`
            : `Your non-pension assets (ISA, cash, GIA) are not sufficient to cover this ${bridgeYears}-year gap. You may need to delay retirement or grow non-pension savings.`}
        </div>
      )}

      {/* Key metrics */}
      <div>
        <h3 className="text-base font-semibold text-gray-800 mb-3">At retirement (age {inputs.retirementAge})</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total portfolio" value={fmt(totalAtRetirement)} color="indigo" />
          <StatCard
            label="SWR income"
            value={fmt(swrIncomeAtRetirement)}
            sub={`${(inputs.swr * 100).toFixed(1)}% SWR per year`}
            color={swrIncomeAtRetirement >= inputs.targetAnnualSpending ? "green" : "red"}
          />
          <StatCard
            label="Target spending"
            value={fmt(inputs.targetAnnualSpending)}
            sub="Post-tax per year"
            color="gray"
          />
          <StatCard
            label={portfolioExhaustedAge ? "Portfolio lasts to" : "Portfolio outlasts"}
            value={portfolioExhaustedAge ? `Age ${portfolioExhaustedAge}` : "Age 100+"}
            color={
              portfolioExhaustedAge === null
                ? "green"
                : portfolioExhaustedAge < 85
                ? "red"
                : "amber"
            }
          />
        </div>
      </div>

      {/* Portfolio breakdown at retirement */}
      {pots.length > 0 && (
        <div>
          <h3 className="text-base font-semibold text-gray-800 mb-3">Portfolio breakdown at retirement</h3>
          <div className="space-y-2">
            {pots.map((pot) => (
              <div key={pot.label} className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${pot.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm text-gray-700">{pot.label}</span>
                    <span className="text-sm font-semibold text-gray-900">{fmt(pot.value)}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${pot.color} opacity-70`}
                      style={{ width: `${Math.min(100, (pot.value / totalAtRetirement) * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{pot.note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Drawdown chart */}
      {drawdownYears.length > 0 && (
        <div>
          <h3 className="text-base font-semibold text-gray-800 mb-1">Portfolio drawdown over time</h3>
          <p className="text-xs text-gray-500 mb-4">
            Showing how your portfolio is drawn down in retirement. Real (inflation-adjusted) values.
            Dashed lines mark pension access (age {inputs.pensionAccessAge}) and state pension start
            (age {inputs.statePensionAge}).
          </p>
          <DrawdownChart
            drawdownYears={drawdownYears}
            pensionAccessAge={inputs.pensionAccessAge}
            statePensionAge={inputs.statePensionAge}
            retirementAge={inputs.retirementAge}
          />
        </div>
      )}

      {/* Year-by-year table (collapsible) */}
      <details className="group">
        <summary className="cursor-pointer text-sm font-medium text-indigo-600 hover:text-indigo-800 select-none list-none flex items-center gap-1">
          <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Show year-by-year breakdown
        </summary>
        <div className="mt-3 overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                {["Age", "Pension", "ISA", "LISA", "Cash", "GIA", "Total", "Tax paid", "State pension"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {drawdownYears.map((y) => (
                <tr key={y.age} className={y.age % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="px-3 py-1.5 font-medium text-gray-900">{y.age}</td>
                  <td className="px-3 py-1.5 text-gray-700">{fmt(y.pension)}</td>
                  <td className="px-3 py-1.5 text-gray-700">{fmt(y.isa)}</td>
                  <td className="px-3 py-1.5 text-gray-700">{fmt(y.lisa)}</td>
                  <td className="px-3 py-1.5 text-gray-700">{fmt(y.cash)}</td>
                  <td className="px-3 py-1.5 text-gray-700">{fmt(y.gia)}</td>
                  <td className="px-3 py-1.5 font-semibold text-gray-900">{fmt(y.portfolioValue)}</td>
                  <td className="px-3 py-1.5 text-red-600">{fmt(y.totalTaxPaid)}</td>
                  <td className="px-3 py-1.5 text-emerald-600">{fmt(y.statePensionIncome)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      {/* Disclaimer */}
      <p className="text-xs text-gray-400 leading-relaxed border-t border-gray-100 pt-4">
        This planner uses 2025/26 UK tax bands and assumes they remain constant. All values are
        in real (inflation-adjusted) terms using a {(inputs.realReturnRate * 100).toFixed(1)}%
        annual real return. This is not financial advice. For personalised advice, consult a
        regulated financial adviser.
      </p>
    </div>
  );
}
