import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { mockRecentTrades } from "@/lib/mock";
import { formatUSD, formatPct } from "@/lib/utils";

export default function RecentTrades() {
  return (
    <div className="rounded-xl p-6" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Recent Closed Trades
        </span>
        <Link href="/history"
          className="flex items-center gap-1 text-xs transition-colors hover:opacity-80"
          style={{ color: "var(--accent)" }}>
          View All <ArrowRight size={12} />
        </Link>
      </div>

      <div className="flex flex-col divide-y" style={{ borderColor: "var(--border)" }}>
        {mockRecentTrades.map((trade, i) => (
          <div key={i} className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              {/* Side badge */}
              <span className="text-xs font-bold px-1.5 py-0.5 rounded"
                style={{
                  background: trade.side === "LONG" ? "rgba(14,203,129,0.15)" : "rgba(246,70,93,0.15)",
                  color: trade.side === "LONG" ? "var(--profit)" : "var(--loss)",
                }}>
                {trade.side}
              </span>
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{trade.symbol}</p>
                <p className="text-xs font-num" style={{ color: "var(--text-secondary)" }}>
                  {formatUSD(trade.entryPrice, 4)} → {formatUSD(trade.exitPrice, 4)} · qty {trade.qty}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold font-num"
                style={{ color: trade.pnl >= 0 ? "var(--profit)" : "var(--loss)" }}>
                {trade.pnl >= 0 ? "+" : ""}{formatUSD(trade.pnl)}
              </p>
              <p className="text-xs font-num" style={{ color: "var(--text-secondary)" }}>
                {formatPct(trade.roe)} · {trade.time}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
