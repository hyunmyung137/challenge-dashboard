"use client";

import { useState, useEffect, useCallback } from "react";
import { formatPnl, formatUSD, cn } from "@/lib/utils";

const RANGES = ["7D", "30D", "90D", "All"] as const;
type Range = (typeof RANGES)[number];
const RANGE_DAYS: Record<Range, number> = { "7D": 7, "30D": 30, "90D": 90, All: 365 };

type ClosedPosition = {
  symbol: string;
  side: "LONG" | "SHORT";
  openDate: string;
  closeDate: string;
  openTime: number;
  closeTime: number;
  entryPrice: number;
  exitPrice: number;
  realizedPnl: number;
};

function priceDecimals(price: number): number {
  if (price >= 1000) return 1;
  if (price >= 10) return 2;
  if (price >= 1) return 3;
  return 4;
}

export default function PNLHistoryTable({ apiBase = "/api/binance" }: { apiBase?: string }) {
  const [range, setRange] = useState<Range>("30D");
  const [positions, setPositions] = useState<ClosedPosition[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async (days: number) => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/position-history?days=${days}`);
      if (!res.ok) return;
      setPositions(await res.json());
    } catch {
      console.error("Failed to fetch position history");
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    fetchHistory(RANGE_DAYS[range]);
  }, [range, fetchHistory]);

  const totalPnl = positions.reduce((s, p) => s + p.realizedPnl, 0);
  const winCount = positions.filter((p) => p.realizedPnl > 0).length;

  return (
    <div className="rounded-xl" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Position History
          </span>
          {!loading && positions.length > 0 && (
            <>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}>
                {positions.length} closed
              </span>
              <span className="text-sm font-semibold font-num"
                style={{ color: totalPnl >= 0 ? "var(--profit)" : "var(--loss)" }}>
                {formatPnl(totalPnl)}
              </span>
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                {winCount}W / {positions.length - winCount}L
              </span>
            </>
          )}
        </div>
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

      {/* Content */}
      {loading ? (
        <div className="p-5 flex flex-col gap-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 rounded-lg animate-pulse" style={{ background: "var(--bg-elevated)" }} />
          ))}
        </div>
      ) : positions.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>No closed positions for this period</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Symbol", "Side", "Opened", "Closed", "Entry", "Exit", "Realized PNL"].map((h) => (
                  <th key={h} className="px-5 py-2.5 text-left font-medium whitespace-nowrap"
                    style={{ color: "var(--text-secondary)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {positions.map((pos, i) => {
                const isLong = pos.side === "LONG";
                const sideColor = isLong ? "var(--profit)" : "var(--loss)";
                const sideBg = isLong ? "rgba(14,203,129,0.12)" : "rgba(246,70,93,0.12)";
                const pnlPos = pos.realizedPnl >= 0;
                const dec = priceDecimals(pos.entryPrice);
                return (
                  <tr key={i}
                    className={cn("transition-colors hover:brightness-110")}
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td className="px-5 py-3 font-semibold whitespace-nowrap" style={{ color: "var(--text-primary)" }}>
                      {pos.symbol.replace("USDT", "")}
                      <span className="ml-1 font-normal" style={{ color: "var(--text-secondary)" }}>USDT</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-bold px-1.5 py-0.5 rounded"
                        style={{ background: sideBg, color: sideColor }}>
                        {pos.side}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-num whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>
                      {pos.openDate}
                    </td>
                    <td className="px-5 py-3 font-num whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>
                      {pos.closeDate}
                    </td>
                    <td className="px-5 py-3 font-num whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>
                      {formatUSD(pos.entryPrice, dec)}
                    </td>
                    <td className="px-5 py-3 font-num whitespace-nowrap" style={{ color: "var(--text-primary)" }}>
                      {formatUSD(pos.exitPrice, dec)}
                    </td>
                    <td className="px-5 py-3 font-semibold font-num whitespace-nowrap"
                      style={{ color: pnlPos ? "var(--profit)" : "var(--loss)" }}>
                      {formatPnl(pos.realizedPnl)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
