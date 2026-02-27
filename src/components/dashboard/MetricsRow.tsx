import { mockMetrics } from "@/lib/mock";
import { formatUSD } from "@/lib/utils";

export default function MetricsRow() {
  const { winRate, wins, losses, profitFactor, avgTrade, totalFees } = mockMetrics;

  return (
    <div className="grid grid-cols-4 gap-4">
      <MetricCard
        label="Win Rate"
        value={`${winRate.toFixed(1)}%`}
        sub={`${wins}W / ${losses}L`}
        valueColor="var(--profit)"
      />
      <MetricCard
        label="Profit Factor"
        value={profitFactor.toFixed(2)}
        sub="gross profit / gross loss"
        valueColor={profitFactor >= 1 ? "var(--profit)" : "var(--loss)"}
      />
      <MetricCard
        label="Avg Trade"
        value={(avgTrade >= 0 ? "+" : "") + formatUSD(avgTrade)}
        sub="per closed trade"
        valueColor={avgTrade >= 0 ? "var(--profit)" : "var(--loss)"}
      />
      <MetricCard
        label="Total Fees"
        value={formatUSD(totalFees)}
        sub="trading fees paid"
        valueColor="var(--text-secondary)"
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
    <div className="rounded-xl px-4 py-3.5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
      <p className="text-xs mb-1.5" style={{ color: "var(--text-secondary)" }}>{label}</p>
      <p className="text-xl font-bold font-num" style={{ color: valueColor }}>{value}</p>
      <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>{sub}</p>
    </div>
  );
}
