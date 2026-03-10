"use client";

import { useState, useEffect, useCallback } from "react";
import { formatPnl, formatUSD, cn } from "@/lib/utils";
import { useEncryptionStore, type ExchangeName } from "@/stores/encryption-store";
import { usePortfolioStore } from "@/stores/portfolio-store";
import { EXCHANGE_INFO } from "@/lib/exchanges";

const RANGES = ["7D", "30D", "90D", "All"] as const;
type Range = (typeof RANGES)[number];
const RANGE_DAYS: Record<Range, number> = { "7D": 7, "30D": 30, "90D": 90, All: 365 };

type ClosedPosition = {
  exchange?: ExchangeName;
  symbol: string;
  side: "LONG" | "SHORT" | "SPOT";
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

export default function PNLHistoryTable() {
  const [range, setRange] = useState<Range>("30D");
  const [positions, setPositions] = useState<ClosedPosition[]>([]);
  const [loading, setLoading] = useState(true);

  const { isUnlocked, credentials } = useEncryptionStore();
  const { activeFilter } = usePortfolioStore();

  const fetchHistory = useCallback(async (days: number) => {
    if (!isUnlocked || credentials.size === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const entries = Array.from(credentials.entries());
      const results = await Promise.all(
        entries.map(async ([key, creds]) => {
          const exchange = key.split(":")[0] as ExchangeName;
          try {
            const res = await fetch(`/api/exchange/${exchange}/income?days=${days}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(creds),
            });
            if (!res.ok) return [];
            return [] as ClosedPosition[];
          } catch {
            return [];
          }
        }),
      );

      const allPositions = results.flat();
      setPositions(allPositions);
    } catch {
      console.error("Failed to fetch position history");
    } finally {
      setLoading(false);
    }
  }, [isUnlocked, credentials]);

  useEffect(() => {
    fetchHistory(RANGE_DAYS[range]);
  }, [range, fetchHistory]);

  // Filter by active exchange
  const filteredPositions = activeFilter
    ? positions.filter((p) => p.exchange === activeFilter)
    : positions;

  const totalPnl = filteredPositions.reduce((s, p) => s + p.realizedPnl, 0);
  const winCount = filteredPositions.filter((p) => p.realizedPnl > 0).length;

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      {/* Header */}
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
            Position History
          </span>
          {!loading && filteredPositions.length > 0 && (
            <>
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
                {filteredPositions.length} closed
              </span>
              <span
                className="font-num"
                style={{
                  fontSize: ".85rem",
                  fontWeight: 700,
                  color: totalPnl >= 0 ? "var(--profit)" : "var(--loss)",
                }}
              >
                {formatPnl(totalPnl)}
              </span>
              <span style={{ fontSize: ".7rem", color: "var(--muted)" }}>
                {winCount}W / {filteredPositions.length - winCount}L
              </span>
            </>
          )}
        </div>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className="px-2.5 py-1 transition-colors"
              style={{
                fontSize: ".65rem",
                fontWeight: 700,
                letterSpacing: ".08em",
                ...(range === r
                  ? { background: "var(--acid)", color: "var(--black)" }
                  : { background: "var(--dim)", color: "var(--muted)", border: "1px solid var(--border)" }),
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="p-5 flex flex-col gap-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse" style={{ height: "40px", background: "var(--dim)" }} />
          ))}
        </div>
      ) : filteredPositions.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <p style={{ fontSize: ".75rem", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--muted)" }}>
            No closed positions for this period
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full" style={{ fontSize: ".75rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Exchange", "Symbol", "Side", "Opened", "Closed", "Entry", "Exit", "Realized PNL"].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-2.5 text-left whitespace-nowrap"
                    style={{
                      fontWeight: 700,
                      letterSpacing: ".08em",
                      textTransform: "uppercase",
                      color: "var(--muted)",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredPositions.map((pos, i) => {
                const isLong = pos.side === "LONG";
                const sideColor = isLong ? "var(--profit)" : "var(--loss)";
                const sideBg = isLong ? "rgba(14,203,129,0.08)" : "rgba(255,45,45,0.08)";
                const pnlPos = pos.realizedPnl >= 0;
                const dec = priceDecimals(pos.entryPrice);
                const info = pos.exchange ? EXCHANGE_INFO[pos.exchange] : null;
                return (
                  <tr
                    key={i}
                    className="transition-colors"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                  >
                    <td className="px-5 py-3">
                      {info && (
                        <span
                          style={{
                            fontSize: ".65rem",
                            fontWeight: 700,
                            letterSpacing: ".06em",
                            textTransform: "uppercase",
                            padding: "2px 6px",
                            background: `${info.color}15`,
                            color: info.color,
                          }}
                        >
                          {info.label}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap" style={{ fontWeight: 700, color: "var(--white)" }}>
                      {pos.symbol.replace("USDT", "")}
                      <span style={{ fontWeight: 400, marginLeft: "4px", color: "var(--muted)" }}>USDT</span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        style={{
                          fontWeight: 700,
                          letterSpacing: ".06em",
                          padding: "2px 6px",
                          background: sideBg,
                          color: sideColor,
                        }}
                      >
                        {pos.side}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-num whitespace-nowrap" style={{ color: "var(--muted)" }}>
                      {pos.openDate}
                    </td>
                    <td className="px-5 py-3 font-num whitespace-nowrap" style={{ color: "var(--muted)" }}>
                      {pos.closeDate}
                    </td>
                    <td className="px-5 py-3 font-num whitespace-nowrap" style={{ color: "var(--muted)" }}>
                      {formatUSD(pos.entryPrice, dec)}
                    </td>
                    <td className="px-5 py-3 font-num whitespace-nowrap" style={{ color: "var(--white)" }}>
                      {formatUSD(pos.exitPrice, dec)}
                    </td>
                    <td
                      className="px-5 py-3 font-num whitespace-nowrap"
                      style={{ fontWeight: 700, color: pnlPos ? "var(--profit)" : "var(--loss)" }}
                    >
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
