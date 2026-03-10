"use client";

import { useEffect, useCallback, useState } from "react";
import Header from "@/components/layout/Header";
import PortfolioHero from "@/components/dashboard/PortfolioHero";
import DailyPNLChart from "@/components/dashboard/DailyPNLChart";
import MetricsRow from "@/components/dashboard/MetricsRow";
import PositionCards from "@/components/dashboard/PositionCards";
import { usePortfolioStore } from "@/stores/portfolio-store";
import type { PortfolioBalance, PortfolioPosition } from "@/stores/portfolio-store";

const API_BASE = "/api/private";
const REFRESH_MS = 60 * 60 * 1000;

/**
 * Legacy private dashboard page.
 *
 * Reads credentials from environment variables (server-side) instead of the
 * multi-exchange encryption flow. Populates the portfolio store manually so
 * the shared dashboard components work unchanged.
 */
export default function PrivateDashboardPage() {
  const { setBalances, setPositions, setLastUpdated } = usePortfolioStore();
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [balanceRes, positionsRes] = await Promise.all([
        fetch(`${API_BASE}/balance`),
        fetch(`${API_BASE}/positions`),
      ]);

      if (balanceRes.ok) {
        const data = await balanceRes.json();
        const balance: PortfolioBalance = {
          exchange: "binance",
          label: "Private",
          totalBalance: Number(data.totalWalletBalance ?? 0),
          availableBalance: Number(data.availableBalance ?? 0),
          unrealizedPnl: Number(data.totalCrossUnPnl ?? 0),
        };
        setBalances([balance]);
      }

      if (positionsRes.ok) {
        const data = await positionsRes.json();
        const positions: PortfolioPosition[] = (data as Record<string, unknown>[])
          .filter((p) => Number(p.positionAmt) !== 0)
          .map((p) => ({
            exchange: "binance" as const,
            label: "Private",
            symbol: String(p.symbol ?? ""),
            side: (Number(p.positionAmt) > 0 ? "LONG" : "SHORT") as "LONG" | "SHORT",
            size: Number(p.positionAmt),
            entryPrice: Number(p.entryPrice),
            markPrice: Number(p.markPrice),
            liquidationPrice: Number(p.liquidationPrice),
            unrealizedPnl: Number(p.unRealizedProfit),
            roe: Number(p.unRealizedProfit) / (Number(p.isolatedWallet) || Number(p.initialMargin) || 1),
            leverage: Number(p.leverage),
            marginType: String(p.marginType ?? "cross") as "cross" | "isolated",
            notionalValue: Number(p.notional),
          }));
        setPositions(positions);
      }

      setLastUpdated(Date.now());
    } catch (err) {
      console.error("Private fetch failed:", err);
    } finally {
      setLoading(false);
    }
  }, [setBalances, setPositions, setLastUpdated]);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, REFRESH_MS);
    return () => clearInterval(interval);
  }, [fetchAll]);

  return (
    <>
      <Header title="Private Portfolio" onRefresh={fetchAll} />
      <div className="flex-1 p-6 flex flex-col gap-5">
        <PortfolioHero />
        <DailyPNLChart legacyApiBase={API_BASE} />
        <MetricsRow legacyApiBase={API_BASE} />
        <PositionCards onRefresh={fetchAll} loadingOverride={loading} />
      </div>
    </>
  );
}
