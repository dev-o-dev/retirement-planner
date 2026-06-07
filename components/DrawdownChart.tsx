"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { DrawdownYear } from "@/lib/types";

interface Props {
  drawdownYears: DrawdownYear[];
  pensionAccessAge: number;
  statePensionAge: number;
  retirementAge: number;
}

function fmt(value: number): string {
  if (value >= 1_000_000) return `£${(value / 1_000_000).toFixed(2)}m`;
  if (value >= 1_000) return `£${(value / 1_000).toFixed(0)}k`;
  return `£${value.toFixed(0)}`;
}

const COLOURS = {
  pension: "#6366f1",
  isa: "#10b981",
  lisa: "#14b8a6",
  cash: "#f59e0b",
  gia: "#f43f5e",
};

const GRID = "#e2e8f0";
const AXIS = "#94a3b8";
const LABEL = "#64748b";

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: number;
}) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (p.value ?? 0), 0);
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-lg p-3 text-sm tnum">
      <p className="font-semibold text-slate-900 mb-2">Age {label}</p>
      {payload.map((p) =>
        p.value > 0 ? (
          <div key={p.name} className="flex justify-between gap-6">
            <span style={{ color: p.color }}>{p.name}</span>
            <span className="font-medium text-slate-700">{fmt(p.value)}</span>
          </div>
        ) : null
      )}
      <div className="border-t border-slate-100 mt-1.5 pt-1.5 flex justify-between font-semibold text-slate-900">
        <span>Total</span>
        <span>{fmt(total)}</span>
      </div>
    </div>
  );
}

export default function DrawdownChart({ drawdownYears, pensionAccessAge, statePensionAge, retirementAge }: Props) {
  const data = drawdownYears.map((y) => ({
    age: y.age,
    Pension: Math.round(y.pension),
    ISA: Math.round(y.isa),
    LISA: Math.round(y.lisa),
    Cash: Math.round(y.cash),
    GIA: Math.round(y.gia),
    total: Math.round(y.portfolioValue),
  }));

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <defs>
            {Object.entries(COLOURS).map(([key, color]) => (
              <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                <stop offset="95%" stopColor={color} stopOpacity={0.2} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
          <XAxis
            dataKey="age"
            tickLine={false}
            axisLine={{ stroke: GRID }}
            tick={{ fontSize: 12, fill: LABEL }}
            label={{ value: "Age", position: "insideBottomRight", offset: -5, fontSize: 12, fill: AXIS }}
          />
          <YAxis
            tickFormatter={(v) => fmt(v)}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: LABEL }}
            width={55}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: AXIS, strokeDasharray: "3 3" }} />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            formatter={(value) => <span className="text-slate-600">{value}</span>}
          />

          {pensionAccessAge > retirementAge && (
            <ReferenceLine
              x={pensionAccessAge}
              stroke={COLOURS.pension}
              strokeDasharray="4 2"
              label={{ value: "Pension access", position: "top", fontSize: 10, fill: COLOURS.pension }}
            />
          )}
          {statePensionAge > retirementAge && (
            <ReferenceLine
              x={statePensionAge}
              stroke={COLOURS.gia}
              strokeDasharray="4 2"
              label={{ value: "State pension", position: "top", fontSize: 10, fill: COLOURS.gia }}
            />
          )}

          <Area type="monotone" dataKey="Pension" stackId="1" stroke={COLOURS.pension} fill={`url(#grad-pension)`} />
          <Area type="monotone" dataKey="ISA" stackId="1" stroke={COLOURS.isa} fill={`url(#grad-isa)`} />
          <Area type="monotone" dataKey="LISA" stackId="1" stroke={COLOURS.lisa} fill={`url(#grad-lisa)`} />
          <Area type="monotone" dataKey="Cash" stackId="1" stroke={COLOURS.cash} fill={`url(#grad-cash)`} />
          <Area type="monotone" dataKey="GIA" stackId="1" stroke={COLOURS.gia} fill={`url(#grad-gia)`} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
