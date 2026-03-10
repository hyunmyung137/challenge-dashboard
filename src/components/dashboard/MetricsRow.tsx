"use client";

import { formatUSD } from "@/lib/utils";
import { useIncome } from "@/hooks/useIncome";

export default function MetricsRow({ legacyApiBase }: { legacyApiBase?: string } = {}) {
  const { data } = useIncome(30, legacyApiBase);

  // Calculate metrics from daily PNL data
  const wins = data.filter((d) => d.dailyPnl > 0).length;
  const losses = data.filter((d) => d.dailyPnl < 0).length;
  const totalDays = wins + losses;
  const winRate = totalDays > 0 ? (wins / totalDays) * 100 : 0;

  const grossProfit = data.reduce((s, d) => s + (d.dailyPnl > 0 ? d.dailyPnl : 0), 0);
  const grossLoss = Math.abs(data.reduce((s, d) => s + (d.dailyPnl < 0 ? d.dailyPnl : 0), 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  const totalPnl = data.reduce((s, d) => s + d.dailyPnl, 0);
  const avgTrade = totalDays > 0 ? totalPnl / totalDays : 0;

  const totalRealized = totalPnl;

  return (
    <div className="grid grid-cols-4 gap-3">
      <MetricCard
        label="Win Rate"
        value={totalDays > 0 ? `${winRate.toFixed(1)}%` : "—"}
        sub={totalDays > 0 ? `${wins}W / ${losses}L (30D)` : "No data"}
        valueColor={winRate >= 50 ? "var(--profit)" : winRate > 0 ? "var(--loss)" : "var(--muted)"}
      />
      <MetricCard
        label="Profit Factor"
        value={totalDays > 0 ? (profitFactor === Infinity ? "∞" : profitFactor.toFixed(2)) : "—"}
        sub="gross profit / gross loss"
        valueColor={profitFactor >= 1 ? "var(--profit)" : profitFactor > 0 ? "var(--loss)" : "var(--muted)"}
      />
      <MetricCard
        label="Avg Daily PNL"
        value={totalDays > 0 ? (avgTrade >= 0 ? "+" : "") + formatUSD(avgTrade) : "—"}
        sub="per trading day"
        valueColor={avgTrade >= 0 ? "var(--profit)" : "var(--loss)"}
      />
      <MetricCard
        label="Total PNL (30D)"
        value={totalDays > 0 ? (totalRealized >= 0 ? "+" : "") + formatUSD(totalRealized) : "—"}
        sub="realized profit/loss"
        valueColor={totalRealized >= 0 ? "var(--profit)" : "var(--loss)"}
      />
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
  valueColor,
}: {
  label: string;
  value: string;
  sub: string;
  valueColor: string;
}) {
  return (
    <div className="px-4 py-3.5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <p
        style={{
          fontSize: ".7rem",
          letterSpacing: ".1em",
          textTransform: "uppercase",
          color: "var(--muted)",
          marginBottom: "6px",
        }}
      >
        {label}
      </p>
      <p className="font-display" style={{ fontSize: "1.4rem", color: valueColor, lineHeight: 1 }}>
        {value}
      </p>
      <p style={{ fontSize: ".65rem", color: "var(--muted)", marginTop: "6px" }}>{sub}</p>
    </div>
  );
}
