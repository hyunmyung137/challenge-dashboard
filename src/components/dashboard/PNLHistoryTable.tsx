"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { formatPnl } from "@/lib/utils";

const RANGES = ["7D", "30D", "90D", "All"] as const;
type Range = (typeof RANGES)[number];
const RANGE_DAYS: Record<Range, number> = { "7D": 7, "30D": 30, "90D": 90, All: 365 };

type Trade = { time: number; date: string; symbol: string; pnl: number };
type BySymbol = { symbol: string; trades: number; totalPnl: number; avgPnl: number };

export default function PNLHistoryTable({ apiBase = "/api/binance" }: { apiBase?: string }) {
  const [range, setRange] = useState<Range>("30D");
  const [view, setView] = useState<"symbol" | "trade">("trade");
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrades = useCallback(async (days: number) => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/trades?days=${days}`);
      if (!res.ok) return;
      setTrades(await res.json());
    } catch {
      console.error("Failed to fetch trade history");
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    fetchTrades(RANGE_DAYS[range]);
  }, [range, fetchTrades]);

  const bySymbol = useMemo<BySymbol[]>(() => {
    const map: Record<string, { count: number; total: number }> = {};
    for (const t of trades) {
      if (!map[t.symbol]) map[t.symbol] = { count: 0, total: 0 };
      map[t.symbol].count += 1;
      map[t.symbol].total += t.pnl;
    }
    return Object.entries(map)
      .map(([symbol, { count, total }]) => ({
        symbol,
        trades: count,
        totalPnl: parseFloat(total.toFixed(2)),
        avgPnl: parseFloat((total / count).toFixed(2)),
      }))
      .sort((a, b) => b.totalPnl - a.totalPnl);
  }, [trades]);

  const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);

  return (
    <div className="rounded-xl" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            PNL History
          </span>
          {!loading && trades.length > 0 && (
            <span className="text-sm font-semibold font-num"
              style={{ color: totalPnl >= 0 ? "var(--profit)" : "var(--loss)" }}>
              {formatPnl(totalPnl)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            {(["symbol", "trade"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)}
                className="px-3 py-1 text-xs font-medium transition-colors"
                style={view === v
                  ? { background: "var(--bg-elevated)", color: "var(--text-primary)" }
                  : { background: "transparent", color: "var(--text-secondary)" }}>
                {v === "symbol" ? "By Symbol" : "By Trade"}
              </button>
            ))}
          </div>
          {/* Range tabs */}
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
      </div>

      {/* Content */}
      {loading ? (
        <div className="p-5 flex flex-col gap-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-9 rounded-lg animate-pulse" style={{ background: "var(--bg-elevated)" }} />
          ))}
        </div>
      ) : trades.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>No trade history for this period</p>
        </div>
      ) : view === "symbol" ? (
        <BySymbolView rows={bySymbol} />
      ) : (
        <ByTradeView trades={trades} />
      )}
    </div>
  );
}

function BySymbolView({ rows }: { rows: BySymbol[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            {["Symbol", "Trades", "Total PNL", "Avg / Trade"].map((h) => (
              <th key={h} className="px-5 py-2.5 text-left font-medium"
                style={{ color: "var(--text-secondary)" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.symbol}
              className="transition-colors hover:brightness-110"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <td className="px-5 py-3 font-semibold" style={{ color: "var(--text-primary)" }}>
                {row.symbol.replace("USDT", "")}
                <span className="ml-1 font-normal" style={{ color: "var(--text-secondary)" }}>USDT</span>
              </td>
              <td className="px-5 py-3 font-num" style={{ color: "var(--text-secondary)" }}>
                {row.trades}
              </td>
              <td className="px-5 py-3 font-semibold font-num"
                style={{ color: row.totalPnl >= 0 ? "var(--profit)" : "var(--loss)" }}>
                {formatPnl(row.totalPnl)}
              </td>
              <td className="px-5 py-3 font-num"
                style={{ color: row.avgPnl >= 0 ? "var(--profit)" : "var(--loss)" }}>
                {formatPnl(row.avgPnl)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ByTradeView({ trades }: { trades: Trade[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            {["Date", "Symbol", "Realized PNL"].map((h) => (
              <th key={h} className="px-5 py-2.5 text-left font-medium"
                style={{ color: "var(--text-secondary)" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {trades.map((t, i) => (
            <tr key={i}
              className="transition-colors hover:brightness-110"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <td className="px-5 py-3 font-num" style={{ color: "var(--text-secondary)" }}>
                {t.date}
              </td>
              <td className="px-5 py-3 font-semibold" style={{ color: "var(--text-primary)" }}>
                {t.symbol.replace("USDT", "")}
                <span className="ml-1 font-normal" style={{ color: "var(--text-secondary)" }}>USDT</span>
              </td>
              <td className="px-5 py-3 font-semibold font-num"
                style={{ color: t.pnl >= 0 ? "var(--profit)" : "var(--loss)" }}>
                {formatPnl(t.pnl)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
