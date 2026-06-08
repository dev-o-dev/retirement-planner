"use client";

import { RetirementResults, RetirementInputs } from "@/lib/types";
import DrawdownChart from "./DrawdownChart";

interface Props {
  results: RetirementResults;
  inputs: RetirementInputs;
}

// Shared pot palette (matches the drawdown chart)
const POT_COLORS = {
  pension: "#6366f1",
  isa: "#10b981",
  lisa: "#14b8a6",
  cash: "#f59e0b",
  gia: "#f43f5e",
};

function fmt(n: number, decimals = 0): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

function StatCard({
  label,
  value,
  sub,
  color = "slate",
}: {
  label: string;
  value: string;
  sub?: string;
  color?: "emerald" | "rose" | "amber" | "indigo" | "slate";
}) {
  const valueColor = {
    emerald: "text-emerald-600",
    rose: "text-rose-600",
    amber: "text-amber-600",
    indigo: "text-indigo-600",
    slate: "text-slate-900",
  }[color];
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400 mb-1.5">{label}</p>
      <p className={`text-2xl font-bold tnum leading-none ${valueColor}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1.5 leading-snug">{sub}</p>}
    </div>
  );
}

function Note({
  tone,
  label,
  children,
}: {
  tone: "emerald" | "rose" | "amber" | "indigo";
  label: string;
  children: React.ReactNode;
}) {
  const styles = {
    emerald: "border-emerald-200 bg-emerald-50",
    rose: "border-rose-200 bg-rose-50",
    amber: "border-amber-200 bg-amber-50",
    indigo: "border-indigo-200 bg-indigo-50",
  }[tone];
  const labelColor = {
    emerald: "text-emerald-700",
    rose: "text-rose-700",
    amber: "text-amber-700",
    indigo: "text-indigo-700",
  }[tone];
  const bodyColor = {
    emerald: "text-emerald-800/90",
    rose: "text-rose-800/90",
    amber: "text-amber-800/90",
    indigo: "text-indigo-800/90",
  }[tone];
  return (
    <div className={`rounded-xl border ${styles} p-4`}>
      <p className={`text-xs font-semibold mb-1 ${labelColor}`}>{label}</p>
      <p className={`text-sm leading-relaxed ${bodyColor}`}>{children}</p>
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
    householdRetirementAge,
    needsBridge,
    bridgeYears,
    canBridgeGap,
    lisaPenaltyWarning,
    mortgagePayoff,
    drawdownYears,
    chartMarkers,
    portfolioExhaustedAge,
    ageCanRetire,
  } = results;

  const hasPartner = inputs.people.length > 1;
  const retireAge = householdRetirementAge;

  const sourceLabel: Record<string, string> = {
    cash: "cash savings",
    isa: "the ISA",
    pension: "the pension (25% tax-free, rest taxed)",
  };

  const allGood = canRetire && (!needsBridge || canBridgeGap);
  const bridgeProblem = canRetire && needsBridge && !canBridgeGap;
  const totalAtRetirement = portfolioValueAtRetirement;

  const verdict = allGood
    ? {
        ring: "border-emerald-300 bg-gradient-to-br from-emerald-50 to-white",
        badge: "bg-emerald-100 text-emerald-700",
        title: "text-emerald-900",
        body: "text-emerald-800/90",
        mark: "M5 13l4 4L19 7",
      }
    : bridgeProblem
    ? {
        ring: "border-amber-300 bg-gradient-to-br from-amber-50 to-white",
        badge: "bg-amber-100 text-amber-700",
        title: "text-amber-900",
        body: "text-amber-800/90",
        mark: "M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z",
      }
    : {
        ring: "border-rose-300 bg-gradient-to-br from-rose-50 to-white",
        badge: "bg-rose-100 text-rose-700",
        title: "text-rose-900",
        body: "text-rose-800/90",
        mark: "M6 18L18 6M6 6l12 12",
      };

  const pots = [
    { label: "Pension (DC/SIPP)", value: portfolioAtRetirement.pension, color: POT_COLORS.pension, note: "Accessible from age " + inputs.pensionAccessAge },
    { label: "Stocks & Shares ISA", value: portfolioAtRetirement.isa, color: POT_COLORS.isa, note: "Tax-free withdrawals" },
    { label: "Lifetime ISA", value: portfolioAtRetirement.lisa, color: POT_COLORS.lisa, note: "Tax-free from age 60" },
    { label: "Cash", value: portfolioAtRetirement.cash, color: POT_COLORS.cash, note: "No tax on withdrawals" },
    { label: "GIA", value: portfolioAtRetirement.gia, color: POT_COLORS.gia, note: "CGT on gains" },
  ].filter((p) => p.value > 0);

  return (
    <div className="space-y-6">
      {/* Verdict banner */}
      <div className={`rounded-2xl border p-6 sm:p-7 shadow-sm ${verdict.ring}`}>
        <div className="flex items-start gap-4">
          <div className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${verdict.badge}`}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={verdict.mark} />
            </svg>
          </div>
          <div className="min-w-0">
            <h3 className={`text-xl sm:text-2xl font-bold tracking-tight leading-tight ${verdict.title}`}>
              {allGood
                ? `You're on track to retire ${hasPartner ? "together " : ""}at ${retireAge}`
                : bridgeProblem
                ? "Your portfolio's big enough — but the bridge gap bites"
                : `Not yet ready to retire at ${retireAge}`}
            </h3>
            <p className={`mt-2 text-sm leading-relaxed ${verdict.body}`}>
              {allGood ? (
                <>
                  At {(inputs.swr * 100).toFixed(0)}% SWR, your projected portfolio of{" "}
                  <strong className="tnum">{fmt(totalAtRetirement)}</strong> can sustain{" "}
                  <strong className="tnum">{fmt(swrIncomeAtRetirement)}/year</strong> — exceeding your{" "}
                  <span className="tnum">{fmt(inputs.targetAnnualSpending)}</span> target.
                </>
              ) : bridgeProblem ? (
                <>
                  Your {hasPartner ? "combined " : ""}portfolio is large enough, but you retire at {retireAge} — before
                  pension access at {inputs.pensionAccessAge}. Your non-pension assets aren&apos;t enough to
                  cover the {bridgeYears}-year bridge gap.
                </>
              ) : (
                <>
                  At {(inputs.swr * 100).toFixed(0)}% SWR your portfolio would generate{" "}
                  <strong className="tnum">{fmt(swrIncomeAtRetirement)}/year</strong>, a shortfall of{" "}
                  <strong className="tnum">{fmt(shortfallAtRetirement)}/year</strong> against your{" "}
                  <span className="tnum">{fmt(inputs.targetAnnualSpending)}</span> target.
                  {ageCanRetire !== null && (
                    <> On your current trajectory you could retire {hasPartner ? "together " : ""}at age <strong className="tnum">{ageCanRetire}</strong>.</>
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
        <Note tone="amber" label="LISA penalty warning">
          {hasPartner ? "One of you reaches retirement" : "You retire"} before the LISA penalty-free access age
          of 60. Withdrawing a LISA early incurs a 25% government penalty (you lose the bonus and ~6.25% of your
          own contributions). The planner avoids drawing from a LISA until age 60 where possible.
        </Note>
      )}

      {mortgagePayoff && (
        <Note tone={mortgagePayoff.fullyPaid ? "indigo" : "rose"} label="Mortgage payoff">
          {mortgagePayoff.fullyPaid ? (
            <>
              <span className="tnum">{fmt(mortgagePayoff.amount)}</span> is cleared from{" "}
              {hasPartner ? `${mortgagePayoff.personName}'s ` : ""}{sourceLabel[mortgagePayoff.source]} at age {mortgagePayoff.age}
              {mortgagePayoff.taxPaid > 0 && <>, triggering <span className="tnum">{fmt(mortgagePayoff.taxPaid)}</span> in tax</>}.
              This one-off cost is reflected in the drawdown below, and your SWR income above is based on the
              portfolio net of the mortgage.
            </>
          ) : (
            <>
              {hasPartner ? `${mortgagePayoff.personName}'s chosen pot` : "Your chosen pot"} couldn&apos;t fully cover the{" "}
              <span className="tnum">{fmt(mortgagePayoff.amount)}</span> balance at age {mortgagePayoff.age}. Consider a
              different source, paying it off later, or reducing the balance.
            </>
          )}
        </Note>
      )}

      {needsBridge && (
        <Note tone={canBridgeGap ? "indigo" : "rose"} label={`Bridge gap · ${bridgeYears} years`}>
          You retire at {retireAge}, before {hasPartner ? "either" : "your"} pension is accessible (age {inputs.pensionAccessAge}).{" "}
          {canBridgeGap
            ? "Your ISA, cash, and GIA are sufficient to cover this gap without touching a pension."
            : `Your non-pension assets (ISA, cash, GIA) are not sufficient to cover this ${bridgeYears}-year gap. You may need to delay retirement or grow non-pension savings.`}
        </Note>
      )}

      {/* Key metrics */}
      <div>
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="text-base font-semibold tracking-tight text-slate-800">At retirement</h3>
          <span className="text-xs font-medium text-slate-400">
            {hasPartner ? "Combined · age " : "Age "}{retireAge}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total portfolio" value={fmt(totalAtRetirement)} color="indigo" />
          <StatCard
            label="SWR income"
            value={fmt(swrIncomeAtRetirement)}
            sub={`${(inputs.swr * 100).toFixed(1)}% per year`}
            color={swrIncomeAtRetirement >= inputs.targetAnnualSpending ? "emerald" : "rose"}
          />
          <StatCard label="Target spending" value={fmt(inputs.targetAnnualSpending)} sub="Post-tax per year" color="slate" />
          <StatCard
            label={portfolioExhaustedAge ? "Portfolio lasts to" : "Portfolio outlasts"}
            value={portfolioExhaustedAge ? `Age ${portfolioExhaustedAge}` : "Age 100+"}
            color={portfolioExhaustedAge === null ? "emerald" : portfolioExhaustedAge < 85 ? "rose" : "amber"}
          />
        </div>
      </div>

      {/* Portfolio breakdown */}
      {pots.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-semibold tracking-tight text-slate-800 mb-4">
            {hasPartner ? "Combined portfolio breakdown at retirement" : "Portfolio breakdown at retirement"}
          </h3>
          <div className="space-y-3.5">
            {pots.map((pot) => (
              <div key={pot.label} className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: pot.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm text-slate-700">{pot.label}</span>
                    <span className="text-sm font-semibold text-slate-900 tnum">{fmt(pot.value)}</span>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.min(100, (pot.value / totalAtRetirement) * 100)}%`, backgroundColor: pot.color }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{pot.note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Drawdown chart */}
      {drawdownYears.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-semibold tracking-tight text-slate-800 mb-1">
            {hasPartner ? "Combined portfolio drawdown over time" : "Portfolio drawdown over time"}
          </h3>
          <p className="text-xs text-slate-500 mb-5 leading-relaxed">
            How your {hasPartner ? "household " : ""}portfolio is drawn down in retirement, in real
            (inflation-adjusted) values{hasPartner ? `, plotted against ${inputs.people[0].name || "your"}'s age` : ""}.
            Dashed lines mark pension access and state pension milestones.
          </p>
          <DrawdownChart drawdownYears={drawdownYears} markers={chartMarkers} />
        </div>
      )}

      {/* Year-by-year table */}
      <details className="group">
        <summary className="cursor-pointer text-sm font-medium text-indigo-600 hover:text-indigo-800 select-none list-none flex items-center gap-1.5">
          <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Show year-by-year breakdown
        </summary>
        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-xs tnum">
            <thead className="bg-slate-50">
              <tr>
                {["Age", "Pension", "ISA", "LISA", "Cash", "GIA", "Total", "Tax paid", "State pension"].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left font-semibold text-slate-500 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {drawdownYears.map((y) => (
                <tr key={y.age} className="hover:bg-slate-50/60">
                  <td className="px-3 py-1.5 font-semibold text-slate-900">{y.age}</td>
                  <td className="px-3 py-1.5 text-slate-600">{fmt(y.pension)}</td>
                  <td className="px-3 py-1.5 text-slate-600">{fmt(y.isa)}</td>
                  <td className="px-3 py-1.5 text-slate-600">{fmt(y.lisa)}</td>
                  <td className="px-3 py-1.5 text-slate-600">{fmt(y.cash)}</td>
                  <td className="px-3 py-1.5 text-slate-600">{fmt(y.gia)}</td>
                  <td className="px-3 py-1.5 font-semibold text-slate-900">{fmt(y.portfolioValue)}</td>
                  <td className="px-3 py-1.5 text-rose-600">{fmt(y.totalTaxPaid)}</td>
                  <td className="px-3 py-1.5 text-emerald-600">{fmt(y.statePensionIncome)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      {/* Disclaimer */}
      <p className="text-xs text-slate-400 leading-relaxed border-t border-slate-200 pt-5">
        This planner uses 2025/26 UK tax bands and assumes they remain constant. All values are in real
        (inflation-adjusted) terms using a {(inputs.realReturnRate * 100).toFixed(1)}% annual real return.
        This is not financial advice. For personalised advice, consult a regulated financial adviser.
      </p>
    </div>
  );
}
