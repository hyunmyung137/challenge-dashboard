"use client";

import { useState } from "react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ReferenceLine, ResponsiveContainer, Cell,
} from "recharts";
import { formatPnl } from "@/lib/utils";
import { useIncome } from "@/hooks/useIncome";

const RANGES = ["7D", "30D", "90D", "All"] as const;
type Range = (typeof RANGES)[number];
const RANGE_DAYS: Record<Range, number> = { "7D": 7, "30D": 30, "90D": 90, All: 365 };

type DayData = { date: string; dailyPnl: number; cumulativePnl: number };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const day = payload[0]?.payload as DayData;
  return (
    <div
      className="px-3 py-2 shadow-lg"
      style={{
        fontSize: ".75rem",
        background: "var(--dim)",
        border: "1px solid var(--border)",
        color: "var(--white)",
      }}
    >
      <p className="font-bold mb-1" style={{ color: "var(--muted)" }}>{label}</p>
      <p style={{ color: day?.dailyPnl >= 0 ? "var(--profit)" : "var(--loss)" }}>
        Day PNL: {formatPnl(day?.dailyPnl ?? 0)}
      </p>
      <p style={{ color: "var(--acid)" }}>Cumulative: {formatPnl(day?.cumulativePnl ?? 0)}</p>
    </div>
  );
}

export default function DailyPNLChart({ legacyApiBase }: { legacyApiBase?: string } = {}) {
  const [range, setRange] = useState<Range>("30D");
  const { data, loading } = useIncome(RANGE_DAYS[range], legacyApiBase);

  const todayPnl = data[data.length - 1]?.dailyPnl ?? 0;
  const bestDay = data.length ? data.reduce((a, b) => (b.dailyPnl > a.dailyPnl ? b : a), data[0]) : null;
  const worstDay = data.length ? data.reduce((a, b) => (b.dailyPnl < a.dailyPnl ? b : a), data[0]) : null;
  const totalPnl = data.reduce((sum, d) => sum + d.dailyPnl, 0);

  return (
    <div className="p-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between mb-4">
        <span
          style={{
            fontSize: ".8rem",
            fontWeight: 700,
            letterSpacing: ".08em",
            textTransform: "uppercase",
            color: "var(--white)",
          }}
        >
          Daily PNL
        </span>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className="px-2.5 py-1 transition-colors"
              style={{
                fontSize: ".65rem",
                fontWeight: 700,
                letterSpacing: ".08em",
                ...(range === r
                  ? { background: "var(--acid)", color: "var(--black)" }
                  : { background: "var(--dim)", color: "var(--muted)", border: "1px solid var(--border)" }),
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-5">
        <SummaryCard label="Today" value={todayPnl} />
        <SummaryCard label={`Best  ${bestDay?.date ?? "—"}`} value={bestDay?.dailyPnl ?? 0} />
        <SummaryCard label={`Worst  ${worstDay?.date ?? "—"}`} value={worstDay?.dailyPnl ?? 0} />
        <SummaryCard label={`Total (${range})`} value={totalPnl} />
      </div>

      {loading ? (
        <div className="animate-pulse" style={{ height: "220px", background: "var(--dim)" }} />
      ) : data.length === 0 ? (
        <div className="flex items-center justify-center" style={{ height: "220px" }}>
          <p style={{ fontSize: ".75rem", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--muted)" }}>
            No PNL data for this period
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <XAxis dataKey="date" tick={{ fill: "#555", fontSize: 11 }}
              tickLine={false} axisLine={false}
              interval={data.length <= 7 ? 0 : Math.floor(data.length / 6)} />
            <YAxis yAxisId="bar" tick={{ fill: "#555", fontSize: 11 }}
              tickLine={false} axisLine={false}
              tickFormatter={(v) => (v >= 0 ? `+${v}` : `${v}`)} width={48} />
            <YAxis yAxisId="line" orientation="right"
              tick={{ fill: "#555", fontSize: 11 }}
              tickLine={false} axisLine={false}
              tickFormatter={(v) => `${v > 0 ? "+" : ""}${(v / 1000).toFixed(1)}k`} width={40} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
            <ReferenceLine yAxisId="bar" y={0} stroke="var(--border)" strokeDasharray="3 3" />
            <Bar yAxisId="bar" dataKey="dailyPnl" radius={[2, 2, 0, 0]} maxBarSize={24}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.dailyPnl >= 0 ? "var(--profit)" : "var(--loss)"} fillOpacity={0.85} />
              ))}
            </Bar>
            <Line yAxisId="line" type="monotone" dataKey="cumulativePnl"
              stroke="var(--acid)" strokeWidth={2} dot={false} strokeDasharray="4 2" />
          </ComposedChart>
        </ResponsiveContainer>
      )}

      <div className="flex items-center gap-4 mt-3 justify-end">
        <LegendItem color="var(--profit)" label="Profit day" />
        <LegendItem color="var(--loss)" label="Loss day" />
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-0 border-t-2 border-dashed" style={{ borderColor: "var(--acid)" }} />
          <span style={{ fontSize: ".7rem", color: "var(--muted)" }}>Cumulative</span>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="px-3 py-2.5" style={{ background: "var(--dim)", border: "1px solid var(--border)" }}>
      <p
        className="truncate"
        style={{
          fontSize: ".65rem",
          letterSpacing: ".08em",
          textTransform: "uppercase",
          color: "var(--muted)",
          marginBottom: "4px",
        }}
      >
        {label}
      </p>
      <p
        className="font-num"
        style={{ fontSize: ".9rem", fontWeight: 700, color: value >= 0 ? "var(--profit)" : "var(--loss)" }}
      >
        {formatPnl(value)}
      </p>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-3 h-3" style={{ background: color, opacity: 0.85 }} />
      <span style={{ fontSize: ".7rem", color: "var(--muted)" }}>{label}</span>
    </div>
  );
}
