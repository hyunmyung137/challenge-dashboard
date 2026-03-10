/**
 * Portfolio aggregation logic.
 *
 * Combines data from multiple exchange accounts into unified views.
 */

import type { ExchangeName } from "@/lib/exchanges/types";
import type { PortfolioBalance, PortfolioPosition } from "@/stores/portfolio-store";

export interface AggregatedPortfolio {
  totalValue: number;
  totalUnrealizedPnl: number;
  totalAvailable: number;
  perExchange: Map<ExchangeName, {
    totalBalance: number;
    unrealizedPnl: number;
    positionCount: number;
  }>;
}

/**
 * Aggregate balances and positions across all exchanges.
 */
export function aggregatePortfolio(
  balances: PortfolioBalance[],
  positions: PortfolioPosition[],
): AggregatedPortfolio {
  const perExchange = new Map<ExchangeName, {
    totalBalance: number;
    unrealizedPnl: number;
    positionCount: number;
  }>();

  let totalValue = 0;
  let totalUnrealizedPnl = 0;
  let totalAvailable = 0;

  for (const balance of balances) {
    totalValue += balance.totalBalance + balance.unrealizedPnl;
    totalUnrealizedPnl += balance.unrealizedPnl;
    totalAvailable += balance.availableBalance;

    const existing = perExchange.get(balance.exchange) ?? {
      totalBalance: 0,
      unrealizedPnl: 0,
      positionCount: 0,
    };
    existing.totalBalance += balance.totalBalance;
    existing.unrealizedPnl += balance.unrealizedPnl;
    perExchange.set(balance.exchange, existing);
  }

  // Count positions per exchange
  for (const pos of positions) {
    const existing = perExchange.get(pos.exchange) ?? {
      totalBalance: 0,
      unrealizedPnl: 0,
      positionCount: 0,
    };
    existing.positionCount += 1;
    perExchange.set(pos.exchange, existing);
  }

  return {
    totalValue,
    totalUnrealizedPnl,
    totalAvailable,
    perExchange,
  };
}

/**
 * Calculate trading metrics from income data.
 */
export function calculateMetrics(incomeData: { dailyPnl: number }[]) {
  if (incomeData.length === 0) {
    return { winRate: 0, profitFactor: 0, avgTrade: 0, totalPnl: 0, winCount: 0, lossCount: 0 };
  }

  let wins = 0;
  let losses = 0;
  let totalProfit = 0;
  let totalLoss = 0;
  let totalPnl = 0;

  for (const day of incomeData) {
    totalPnl += day.dailyPnl;
    if (day.dailyPnl > 0) {
      wins++;
      totalProfit += day.dailyPnl;
    } else if (day.dailyPnl < 0) {
      losses++;
      totalLoss += Math.abs(day.dailyPnl);
    }
  }

  const winRate = incomeData.length > 0 ? (wins / incomeData.length) * 100 : 0;
  const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0;
  const avgTrade = incomeData.length > 0 ? totalPnl / incomeData.length : 0;

  return {
    winRate,
    profitFactor,
    avgTrade,
    totalPnl,
    winCount: wins,
    lossCount: losses,
  };
}
