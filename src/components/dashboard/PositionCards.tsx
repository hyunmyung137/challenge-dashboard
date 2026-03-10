"use client";

import { RefreshCw } from "lucide-react";
import { formatUSD, formatPnl, formatPct, cn } from "@/lib/utils";
import { usePortfolioStore, type PortfolioPosition } from "@/stores/portfolio-store";
import { usePortfolio } from "@/hooks/usePortfolio";
import { EXCHANGE_INFO } from "@/lib/exchanges";

export default function PositionCards({ onRefresh, loadingOverride }: { onRefresh?: () => void; loadingOverride?: boolean } = {}) {
  const { getFilteredPositions, lastUpdated } = usePortfolioStore();
  const portfolio = usePortfolio();
  const isLoading = loadingOverride ?? portfolio.isLoading;
  const refresh = onRefresh ?? portfolio.refresh;

  const positions = getFilteredPositions();
  const totalUnrealized = positions.reduce((s, p) => s + p.unrealizedPnl, 0);

  const lastTime = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "";

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div
        className="flex items-center justify-between px-5 py-3.5"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-3">
          <span
            style={{
              fontSize: ".8rem",
              fontWeight: 700,
              letterSpacing: ".08em",
              textTransform: "uppercase",
              color: "var(--white)",
            }}
          >
            Open Positions
          </span>
          <span
            className="font-num"
            style={{
              fontSize: ".7rem",
              fontWeight: 700,
              padding: "2px 8px",
              background: "var(--dim)",
              border: "1px solid var(--border)",
              color: "var(--muted)",
            }}
          >
            {positions.length}
          </span>
          {positions.length > 0 && (
            <span
              className="font-num"
              style={{
                fontSize: ".85rem",
                fontWeight: 700,
                color: totalUnrealized >= 0 ? "var(--profit)" : "var(--loss)",
              }}
            >
              {formatPnl(totalUnrealized)}
            </span>
          )}
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-1.5 px-2.5 py-1.5 transition-colors"
          style={{
            fontSize: ".7rem",
            color: "var(--muted)",
            background: "transparent",
            border: "1px solid var(--border)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--acid)";
            e.currentTarget.style.color = "var(--acid)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--border)";
            e.currentTarget.style.color = "var(--muted)";
          }}
        >
          <RefreshCw size={10} className={isLoading ? "animate-spin" : ""} />
          {lastTime}
        </button>
      </div>

      {isLoading && positions.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px p-5" style={{ background: "var(--border)" }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse" style={{ height: "160px", background: "var(--dim)" }} />
          ))}
        </div>
      ) : positions.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <p style={{ fontSize: ".75rem", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--muted)" }}>
            No open positions
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-5">
          {positions
            .sort((a, b) => Math.abs(b.unrealizedPnl) - Math.abs(a.unrealizedPnl))
            .map((pos) => (
              <PositionCard key={`${pos.exchange}-${pos.symbol}-${pos.side}`} pos={pos} />
            ))}
        </div>
      )}
    </div>
  );
}

function PositionCard({ pos }: { pos: PortfolioPosition }) {
  const isLong = pos.side === "LONG";
  const isSpot = pos.side === "SPOT";
  const sideColor = isSpot ? "var(--acid)" : isLong ? "var(--profit)" : "var(--loss)";
  const sideBg = isSpot
    ? "rgba(200,255,0,0.08)"
    : isLong
    ? "rgba(14,203,129,0.08)"
    : "rgba(255,45,45,0.08)";
  const pnlPos = pos.unrealizedPnl >= 0;
  const margin = pos.leverage > 0 ? (pos.entryPrice * Math.abs(pos.size)) / pos.leverage : 0;
  const exchangeInfo = EXCHANGE_INFO[pos.exchange];

  return (
    <div
      className="p-4 flex flex-col gap-3 transition-all"
      style={{
        background: "var(--dim)",
        border: `1px solid ${isLong ? "rgba(14,203,129,0.15)" : isSpot ? "rgba(200,255,0,0.15)" : "rgba(255,45,45,0.15)"}`,
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Exchange badge */}
          <span
            style={{
              fontSize: ".65rem",
              fontWeight: 700,
              letterSpacing: ".06em",
              textTransform: "uppercase",
              padding: "2px 6px",
              background: `${exchangeInfo?.color ?? "#888"}15`,
              color: exchangeInfo?.color ?? "#888",
            }}
          >
            {exchangeInfo?.label ?? pos.exchange}
          </span>
          <span style={{ fontSize: ".9rem", fontWeight: 700, color: "var(--white)" }}>
            {pos.symbol.replace(/USDT$/, "").replace(/USD$/, "")}
            <span style={{ fontSize: ".7rem", fontWeight: 400, marginLeft: "4px", color: "var(--muted)" }}>
              {pos.symbol.includes("KRW") ? "KRW" : "USDT"}
            </span>
          </span>
          <span
            style={{
              fontSize: ".65rem",
              fontWeight: 700,
              letterSpacing: ".06em",
              padding: "2px 6px",
              background: sideBg,
              color: sideColor,
            }}
          >
            {pos.side}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {pos.leverage > 1 && (
            <span
              className="font-num"
              style={{
                fontSize: ".65rem",
                fontWeight: 700,
                padding: "2px 6px",
                background: "rgba(200,255,0,0.08)",
                color: "var(--acid)",
              }}
            >
              {pos.leverage}x
            </span>
          )}
          <span
            style={{
              fontSize: ".65rem",
              textTransform: "capitalize",
              color: "var(--muted)",
            }}
          >
            {pos.marginType}
          </span>
        </div>
      </div>

      <div className="pb-3" style={{ borderBottom: "1px solid var(--border)" }}>
        <p style={{ fontSize: ".65rem", letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "4px" }}>
          Unrealized PNL (USDT)
        </p>
        <div className="flex items-baseline gap-2">
          <span
            className="font-display"
            style={{ fontSize: "1.5rem", color: pnlPos ? "var(--profit)" : "var(--loss)" }}
          >
            {formatPnl(pos.unrealizedPnl)}
          </span>
          <span
            className="font-num"
            style={{ fontSize: ".85rem", fontWeight: 600, color: pnlPos ? "var(--profit)" : "var(--loss)" }}
          >
            ({formatPct(pos.roe)})
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-y-2.5 gap-x-4">
        <DetailRow label="Size" value={`${Math.abs(pos.size)}`} />
        {margin > 0 && <DetailRow label="Margin" value={formatUSD(margin)} />}
        <DetailRow label="Entry Price" value={formatUSD(pos.entryPrice, priceDecimals(pos.entryPrice))} />
        <DetailRow label="Mark Price" value={formatUSD(pos.markPrice, priceDecimals(pos.markPrice))} highlight />
        {pos.liquidationPrice > 0 && (
          <DetailRow
            label="Liq. Price"
            value={formatUSD(pos.liquidationPrice, priceDecimals(pos.liquidationPrice))}
            valueColor="var(--loss)"
          />
        )}
      </div>
    </div>
  );
}

function DetailRow({ label, value, highlight, valueColor }: {
  label: string; value: string; highlight?: boolean; valueColor?: string;
}) {
  return (
    <div>
      <p style={{ fontSize: ".65rem", letterSpacing: ".06em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "2px" }}>
        {label}
      </p>
      <p
        className="font-num"
        style={{
          fontSize: ".75rem",
          fontWeight: 600,
          color: valueColor ?? (highlight ? "var(--white)" : "var(--muted)"),
        }}
      >
        {value}
      </p>
    </div>
  );
}

function priceDecimals(price: number): number {
  if (price >= 1000) return 1;
  if (price >= 10) return 2;
  if (price >= 1) return 3;
  return 4;
}
