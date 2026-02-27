"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ReferenceLine, ResponsiveContainer, Cell,
} from "recharts";
import { formatPnl } from "@/lib/utils";

const RANGES = ["7D", "30D", "90D", "All"] as const;
type Range = (typeof RANGES)[number];
const RANGE_DAYS: Record<Range, number> = { "7D": 7, "30D": 30, "90D": 90, All: 365 };
const REFRESH_MS = 60 * 60 * 1000;

type DayData = { date: string; dailyPnl: number; cumulativePnl: number };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const day = payload[0]?.payload as DayData;
  return (
    <div className="rounded-lg px-3 py-2 text-xs shadow-lg"
      style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
      <p className="font-medium mb-1" style={{ color: "var(--text-secondary)" }}>{label}</p>
      <p style={{ color: day?.dailyPnl >= 0 ? "var(--profit)" : "var(--loss)" }}>
        Day PNL: {formatPnl(day?.dailyPnl ?? 0)}
      </p>
      <p style={{ color: "var(--accent)" }}>Cumulative: {formatPnl(day?.cumulativePnl ?? 0)}</p>
    </div>
  );
}

export default function DailyPNLChart() {
  const [range, setRange] = useState<Range>("30D");
  const [data, setData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchIncome = useCallback(async (days: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/binance/income?days=${days}`);
      if (!res.ok) return;
      setData(await res.json());
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIncome(RANGE_DAYS[range]);
    const interval = setInterval(() => fetchIncome(RANGE_DAYS[range]), REFRESH_MS);
    return () => clearInterval(interval);
  }, [range, fetchIncome]);

  const todayPnl = data[data.length - 1]?.dailyPnl ?? 0;
  const bestDay = data.length ? data.reduce((a, b) => (b.dailyPnl > a.dailyPnl ? b : a), data[0]) : null;
  const worstDay = data.length ? data.reduce((a, b) => (b.dailyPnl < a.dailyPnl ? b : a), data[0]) : null;
  const totalPnl = data.reduce((sum, d) => sum + d.dailyPnl, 0);

  return (
    <div className="rounded-xl p-6" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Daily PNL</span>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button key={r} onClick={() => setRange(r)}
              className="px-2.5 py-1 rounded text-xs font-medium transition-colors"
              style={range === r
                ? { background: "var(--accent)", color: "#000" }
                : { background: "var(--bg-elevated)", color: "var(--text-secondary)" }}>
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-5">
        <SummaryCard label="Today" value={todayPnl} />
        <SummaryCard label={`Best  ${bestDay?.date ?? "—"}`} value={bestDay?.dailyPnl ?? 0} />
        <SummaryCard label={`Worst  ${worstDay?.date ?? "—"}`} value={worstDay?.dailyPnl ?? 0} />
        <SummaryCard label={`Total (${range})`} value={totalPnl} />
      </div>

      {loading ? (
        <div className="h-[220px] rounded-lg animate-pulse" style={{ background: "var(--bg-elevated)" }} />
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <XAxis dataKey="date" tick={{ fill: "var(--text-secondary)", fontSize: 10 }}
              tickLine={false} axisLine={false}
              interval={data.length <= 7 ? 0 : Math.floor(data.length / 6)} />
            <YAxis yAxisId="bar" tick={{ fill: "var(--text-secondary)", fontSize: 10 }}
              tickLine={false} axisLine={false}
              tickFormatter={(v) => (v >= 0 ? `+${v}` : `${v}`)} width={48} />
            <YAxis yAxisId="line" orientation="right"
              tick={{ fill: "var(--text-secondary)", fontSize: 10 }}
              tickLine={false} axisLine={false}
              tickFormatter={(v) => `${v > 0 ? "+" : ""}${(v / 1000).toFixed(1)}k`} width={40} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
            <ReferenceLine yAxisId="bar" y={0} stroke="var(--border)" strokeDasharray="3 3" />
            <Bar yAxisId="bar" dataKey="dailyPnl" radius={[3, 3, 0, 0]} maxBarSize={24}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.dailyPnl >= 0 ? "var(--profit)" : "var(--loss)"} fillOpacity={0.85} />
              ))}
            </Bar>
            <Line yAxisId="line" type="monotone" dataKey="cumulativePnl"
              stroke="var(--accent)" strokeWidth={2} dot={false} strokeDasharray="4 2" />
          </ComposedChart>
        </ResponsiveContainer>
      )}

      <div className="flex items-center gap-4 mt-3 justify-end">
        <LegendItem color="var(--profit)" label="Profit day" />
        <LegendItem color="var(--loss)" label="Loss day" />
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-0 border-t-2 border-dashed" style={{ borderColor: "var(--accent)" }} />
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Cumulative</span>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg px-3 py-2.5" style={{ background: "var(--bg-elevated)" }}>
      <p className="text-xs mb-1 truncate" style={{ color: "var(--text-secondary)" }}>{label}</p>
      <p className="text-sm font-semibold font-num" style={{ color: value >= 0 ? "var(--profit)" : "var(--loss)" }}>
        {formatPnl(value)}
      </p>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-3 h-3 rounded-sm" style={{ background: color, opacity: 0.85 }} />
      <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{label}</span>
    </div>
  );
}
