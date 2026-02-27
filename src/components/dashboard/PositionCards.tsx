"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { formatUSD, formatPnl, formatPct, cn } from "@/lib/utils";

type Position = {
  symbol: string;
  positionAmt: number;
  entryPrice: number;
  markPrice: number;
  liquidationPrice: number;
  unrealizedPnl: number;
  leverage: number;
  marginType: string;
  isolatedMargin: number;
  side: "LONG" | "SHORT";
  roe: number;
};

export default function PositionCards({ apiBase = "/api/binance" }: { apiBase?: string }) {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchPositions = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/positions`);
      if (!res.ok) throw new Error("API error");
      setPositions(await res.json());
      setLastUpdated(new Date());
    } catch {
      console.error("Failed to fetch positions");
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    fetchPositions();
    const interval = setInterval(fetchPositions, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchPositions]);

  const totalUnrealized = positions.reduce((s, p) => s + p.unrealizedPnl, 0);

  return (
    <div className="rounded-xl" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Open Positions</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}>
            {positions.length}
          </span>
          {positions.length > 0 && (
            <span className="text-sm font-semibold font-num"
              style={{ color: totalUnrealized >= 0 ? "var(--profit)" : "var(--loss)" }}>
              {formatPnl(totalUnrealized)}
            </span>
          )}
        </div>
        <button onClick={fetchPositions}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors hover:bg-[var(--bg-elevated)]"
          style={{ color: "var(--text-secondary)" }}>
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          {lastUpdated.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-xl p-4 animate-pulse h-40" style={{ background: "var(--bg-elevated)" }} />
          ))}
        </div>
      ) : positions.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>No open positions</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-5">
          {positions.map((pos) => (
            <PositionCard key={`${pos.symbol}-${pos.side}`} pos={pos} />
          ))}
        </div>
      )}
    </div>
  );
}

function PositionCard({ pos }: { pos: Position }) {
  const isLong = pos.side === "LONG";
  const sideColor = isLong ? "var(--profit)" : "var(--loss)";
  const sideBg = isLong ? "rgba(14,203,129,0.12)" : "rgba(246,70,93,0.12)";
  const pnlPos = pos.unrealizedPnl >= 0;
  const margin = (pos.entryPrice * Math.abs(pos.positionAmt)) / pos.leverage;

  return (
    <div className="rounded-xl p-4 flex flex-col gap-3 transition-all hover:brightness-110"
      style={{ background: "var(--bg-elevated)", border: `1px solid ${isLong ? "rgba(14,203,129,0.2)" : "rgba(246,70,93,0.2)"}` }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
            {pos.symbol.replace("USDT", "")}
            <span className="text-xs font-normal ml-1" style={{ color: "var(--text-secondary)" }}>USDT</span>
          </span>
          <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ background: sideBg, color: sideColor }}>
            {pos.side}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs px-1.5 py-0.5 rounded font-medium"
            style={{ background: "rgba(240,185,11,0.12)", color: "var(--accent)" }}>
            {pos.leverage}x
          </span>
          <span className="text-xs capitalize" style={{ color: "var(--text-secondary)" }}>{pos.marginType}</span>
        </div>
      </div>

      <div className="border-b pb-3" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <p className="text-xs mb-0.5" style={{ color: "var(--text-secondary)" }}>Unrealized PNL (USDT)</p>
        <div className="flex items-baseline gap-2">
          <span className={cn("text-2xl font-bold font-num")} style={{ color: pnlPos ? "var(--profit)" : "var(--loss)" }}>
            {formatPnl(pos.unrealizedPnl)}
          </span>
          <span className="text-sm font-medium font-num" style={{ color: pnlPos ? "var(--profit)" : "var(--loss)" }}>
            ({formatPct(pos.roe)})
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-y-2.5 gap-x-4">
        <DetailRow label="Size" value={`${Math.abs(pos.positionAmt)}`} />
        <DetailRow label="Margin" value={formatUSD(margin)} />
        <DetailRow label="Entry Price" value={formatUSD(pos.entryPrice, priceDecimals(pos.entryPrice))} />
        <DetailRow label="Mark Price" value={formatUSD(pos.markPrice, priceDecimals(pos.markPrice))} highlight />
        <DetailRow
          label="Liq. Price"
          value={pos.liquidationPrice > 0 ? formatUSD(pos.liquidationPrice, priceDecimals(pos.liquidationPrice)) : "—"}
          valueColor="var(--loss)"
        />
      </div>
    </div>
  );
}

function DetailRow({ label, value, highlight, valueColor }: {
  label: string; value: string; highlight?: boolean; valueColor?: string;
}) {
  return (
    <div>
      <p className="text-xs mb-0.5" style={{ color: "var(--text-secondary)" }}>{label}</p>
      <p className="text-xs font-semibold font-num"
        style={{ color: valueColor ?? (highlight ? "var(--text-primary)" : "var(--text-secondary)") }}>
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
