"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { mockBalance, mockPositions } from "@/lib/mock";
import { formatUSD, formatPct } from "@/lib/utils";

type Balance = {
  totalWalletBalance: number;
  availableBalance: number;
};

type Position = {
  unrealizedPnl: number;
};

const USE_MOCK = !process.env.NEXT_PUBLIC_USE_REAL_API;

const REFRESH_MS = 60 * 60 * 1000; // 1 hour

export default function PortfolioHero() {
  const [balance, setBalance] = useState<Balance>(
    USE_MOCK
      ? { totalWalletBalance: mockBalance.totalWalletBalance, availableBalance: mockBalance.availableBalance }
      : { totalWalletBalance: 0, availableBalance: 0 }
  );
  const [unrealizedPnl, setUnrealizedPnl] = useState(
    USE_MOCK ? mockPositions.reduce((s, p) => s + p.unrealizedPnl, 0) : 0
  );
  const [now, setNow] = useState("");

  useEffect(() => {
    const tick = () =>
      setNow(new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    tick();

    if (USE_MOCK) return;

    async function fetchAll() {
      try {
        const [balRes, posRes] = await Promise.all([
          fetch("/api/binance/balance"),
          fetch("/api/binance/positions"),
        ]);

        if (balRes.ok) {
          const b = await balRes.json();
          setBalance({ totalWalletBalance: b.totalWalletBalance, availableBalance: b.availableBalance });
        }

        if (posRes.ok) {
          const positions: Position[] = await posRes.json();
          const totalUnrealized = positions.reduce((s, p) => s + p.unrealizedPnl, 0);
          setUnrealizedPnl(totalUnrealized);
        }

        tick();
      } catch {}
    }

    fetchAll();
    const interval = setInterval(fetchAll, REFRESH_MS);
    return () => clearInterval(interval);
  }, []);

  const { totalWalletBalance, availableBalance } = balance;
  const portfolioValue = totalWalletBalance + unrealizedPnl;
  const marginUsed = totalWalletBalance - availableBalance;
  const marginUsedPct = totalWalletBalance > 0 ? (marginUsed / totalWalletBalance) * 100 : 0;
  const isPositive = unrealizedPnl >= 0;
  const unrealizedPct = totalWalletBalance > 0 ? (unrealizedPnl / totalWalletBalance) * 100 : 0;

  return (
    <div className="rounded-xl p-6" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Total Portfolio Value</span>
        {now && (
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Updated {now}</span>
            <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}>
              auto-refresh 1h
            </span>
          </div>
        )}
      </div>

      {/* Main portfolio value */}
      <div className="flex items-end gap-4 mb-6">
        <span className="text-4xl font-bold font-num tracking-tight" style={{ color: "var(--text-primary)" }}>
          {formatUSD(portfolioValue)}
        </span>
        <div className="flex items-center gap-1 text-sm font-medium mb-1 font-num"
          style={{ color: isPositive ? "var(--profit)" : "var(--loss)" }}>
          {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          <span>{unrealizedPnl >= 0 ? "+" : ""}{formatUSD(unrealizedPnl)}</span>
          <span>({formatPct(unrealizedPct)}) unrealized</span>
        </div>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-4 gap-4 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
        <StatItem label="Wallet Balance" value={formatUSD(totalWalletBalance)} sub="USDT futures" />
        <StatItem
          label="Unrealized PNL"
          value={(unrealizedPnl >= 0 ? "+" : "") + formatUSD(unrealizedPnl)}
          valueColor={unrealizedPnl >= 0 ? "var(--profit)" : "var(--loss)"}
          sub="open positions"
        />
        <StatItem label="Available Balance" value={formatUSD(availableBalance)} sub="to trade" />
        <div>
          <p className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>Margin Used</p>
          <p className="text-sm font-semibold font-num" style={{ color: "var(--text-primary)" }}>
            {marginUsedPct.toFixed(1)}%
          </p>
          <div className="mt-1.5 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
            <div className="h-full rounded-full transition-all" style={{
              width: `${Math.min(marginUsedPct, 100)}%`,
              background: marginUsedPct > 70 ? "var(--loss)" : marginUsedPct > 40 ? "var(--accent)" : "var(--profit)",
            }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatItem({ label, value, sub, valueColor }: { label: string; value: string; sub?: string; valueColor?: string }) {
  return (
    <div>
      <p className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>{label}</p>
      <p className="text-sm font-semibold font-num" style={{ color: valueColor ?? "var(--text-primary)" }}>{value}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{sub}</p>}
    </div>
  );
}
