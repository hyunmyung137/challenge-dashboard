"use client";

import { TrendingUp, TrendingDown } from "lucide-react";
import { formatUSD, formatPct } from "@/lib/utils";
import { usePortfolioStore } from "@/stores/portfolio-store";
import { EXCHANGE_INFO } from "@/lib/exchanges";

export default function PortfolioHero() {
  const {
    getFilteredBalances,
    getTotalValue,
    getTotalUnrealizedPnl,
    lastUpdated,
  } = usePortfolioStore();

  const filteredBalances = getFilteredBalances();
  const totalBalance = filteredBalances.reduce((s, b) => s + b.totalBalance, 0);
  const totalAvailable = filteredBalances.reduce((s, b) => s + b.availableBalance, 0);
  const unrealizedPnl = filteredBalances.reduce((s, b) => s + b.unrealizedPnl, 0);
  const portfolioValue = totalBalance + unrealizedPnl;
  const marginUsed = totalBalance - totalAvailable;
  const marginUsedPct = totalBalance > 0 ? (marginUsed / totalBalance) * 100 : 0;
  const isPositive = unrealizedPnl >= 0;
  const unrealizedPct = totalBalance > 0 ? (unrealizedPnl / totalBalance) * 100 : 0;

  const now = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : null;

  return (
    <div className="p-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="flex items-start justify-between mb-2">
        <span
          style={{
            fontSize: ".75rem",
            letterSpacing: ".12em",
            textTransform: "uppercase",
            color: "var(--muted)",
          }}
        >
          Total Portfolio Value
        </span>
        {now && (
          <div className="flex items-center gap-2">
            <span style={{ fontSize: ".7rem", color: "var(--muted)" }}>Updated {now}</span>
            <span
              style={{
                fontSize: ".65rem",
                letterSpacing: ".08em",
                textTransform: "uppercase",
                padding: "2px 6px",
                background: "var(--dim)",
                border: "1px solid var(--border)",
                color: "var(--muted)",
              }}
            >
              auto 1h
            </span>
          </div>
        )}
      </div>

      <div className="flex items-end gap-4 mb-6">
        <span className="font-display" style={{ fontSize: "2.6rem", color: "var(--white)", lineHeight: 1 }}>
          {formatUSD(portfolioValue)}
        </span>
        <div
          className="flex items-center gap-1 mb-1 font-num"
          style={{
            fontSize: ".9rem",
            fontWeight: 600,
            color: isPositive ? "var(--profit)" : "var(--loss)",
          }}
        >
          {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          <span>{unrealizedPnl >= 0 ? "+" : ""}{formatUSD(unrealizedPnl)}</span>
          <span>({formatPct(unrealizedPct)}) unrealized</span>
        </div>
      </div>

      {/* Per-exchange breakdown */}
      {filteredBalances.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {filteredBalances.map((b) => {
            const info = EXCHANGE_INFO[b.exchange];
            return (
              <div
                key={`${b.exchange}-${b.label}`}
                className="flex items-center gap-1.5 px-2.5 py-1"
                style={{
                  fontSize: ".75rem",
                  background: "var(--dim)",
                  border: "1px solid var(--border)",
                }}
              >
                <div className="w-2 h-2" style={{ background: info?.color ?? "#888" }} />
                <span style={{ color: "var(--muted)" }}>{info?.label ?? b.exchange}</span>
                <span className="font-num font-bold" style={{ color: "var(--white)" }}>
                  {formatUSD(b.totalBalance + b.unrealizedPnl)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div
        className="grid grid-cols-4 gap-4 pt-4"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <StatItem label="Wallet Balance" value={formatUSD(totalBalance)} sub="all exchanges" />
        <StatItem
          label="Unrealized PNL"
          value={(unrealizedPnl >= 0 ? "+" : "") + formatUSD(unrealizedPnl)}
          valueColor={unrealizedPnl >= 0 ? "var(--profit)" : "var(--loss)"}
          sub="open positions"
        />
        <StatItem label="Available Balance" value={formatUSD(totalAvailable)} sub="to trade" />
        <div>
          <p
            style={{
              fontSize: ".7rem",
              letterSpacing: ".1em",
              textTransform: "uppercase",
              color: "var(--muted)",
              marginBottom: "4px",
            }}
          >
            Margin Used
          </p>
          <p className="font-num" style={{ fontSize: ".95rem", fontWeight: 700, color: "var(--white)" }}>
            {marginUsedPct.toFixed(1)}%
          </p>
          <div
            className="mt-1.5 overflow-hidden"
            style={{ height: "3px", background: "var(--dim)" }}
          >
            <div
              className="h-full transition-all"
              style={{
                width: `${Math.min(marginUsedPct, 100)}%`,
                background:
                  marginUsedPct > 70
                    ? "var(--loss)"
                    : marginUsedPct > 40
                    ? "var(--acid)"
                    : "var(--profit)",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatItem({
  label,
  value,
  sub,
  valueColor,
}: {
  label: string;
  value: string;
  sub?: string;
  valueColor?: string;
}) {
  return (
    <div>
      <p
        style={{
          fontSize: ".7rem",
          letterSpacing: ".1em",
          textTransform: "uppercase",
          color: "var(--muted)",
          marginBottom: "4px",
        }}
      >
        {label}
      </p>
      <p className="font-num" style={{ fontSize: ".95rem", fontWeight: 700, color: valueColor ?? "var(--white)" }}>
        {value}
      </p>
      {sub && (
        <p style={{ fontSize: ".65rem", color: "var(--muted)", marginTop: "2px" }}>{sub}</p>
      )}
    </div>
  );
}
