"use client";

import { useCallback, useEffect, useRef } from "react";
import { useEncryptionStore, type ExchangeName } from "@/stores/encryption-store";
import { usePortfolioStore, type PortfolioBalance, type PortfolioPosition } from "@/stores/portfolio-store";

const REFRESH_MS = 60 * 60 * 1000; // 1 hour

/**
 * Hook that fetches portfolio data from all connected exchanges.
 *
 * Flow:
 * 1. Get decrypted credentials from encryption store
 * 2. POST to /api/exchange/[exchange]/balance with transient keys
 * 3. POST to /api/exchange/[exchange]/positions with transient keys
 * 4. Store results in portfolio store
 */
export function usePortfolio() {
  const { isUnlocked, credentials } = useEncryptionStore();
  const {
    setBalances,
    setPositions,
    setLoading,
    setError,
    setLastUpdated,
    balances,
    positions,
    loading,
    errors,
    activeFilter,
  } = usePortfolioStore();

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchExchangeData = useCallback(
    async (exchange: ExchangeName, creds: { apiKey: string; apiSecret: string; passphrase?: string }) => {
      setLoading(exchange, true);
      setError(exchange, null);

      try {
        // Fetch balance and positions in parallel
        const [balanceRes, positionsRes] = await Promise.all([
          fetch(`/api/exchange/${exchange}/balance`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(creds),
          }),
          fetch(`/api/exchange/${exchange}/positions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(creds),
          }),
        ]);

        if (!balanceRes.ok) {
          const err = await balanceRes.json();
          throw new Error(err.error || `Failed to fetch ${exchange} balance`);
        }
        if (!positionsRes.ok) {
          const err = await positionsRes.json();
          throw new Error(err.error || `Failed to fetch ${exchange} positions`);
        }

        const balance: PortfolioBalance = await balanceRes.json();
        const exchangePositions: PortfolioPosition[] = await positionsRes.json();

        return { balance, positions: exchangePositions };
      } catch (err) {
        setError(exchange, err instanceof Error ? err.message : String(err));
        return null;
      } finally {
        setLoading(exchange, false);
      }
    },
    [setLoading, setError],
  );

  const fetchAll = useCallback(async () => {
    if (!isUnlocked) return;

    const allBalances: PortfolioBalance[] = [];
    const allPositions: PortfolioPosition[] = [];

    const entries = Array.from(credentials.entries());
    if (entries.length === 0) return;

    const results = await Promise.all(
      entries.map(async ([key, creds]) => {
        const exchange = key.split(":")[0] as ExchangeName;
        return fetchExchangeData(exchange, creds);
      }),
    );

    for (const result of results) {
      if (result) {
        allBalances.push(result.balance);
        allPositions.push(...result.positions);
      }
    }

    setBalances(allBalances);
    setPositions(allPositions);
    setLastUpdated(Date.now());
  }, [isUnlocked, credentials, fetchExchangeData, setBalances, setPositions, setLastUpdated]);

  // Fetch on mount and set up interval
  useEffect(() => {
    if (isUnlocked && credentials.size > 0) {
      fetchAll();

      intervalRef.current = setInterval(fetchAll, REFRESH_MS);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
  }, [isUnlocked, credentials.size, fetchAll]);

  const isLoading = Array.from(loading.values()).some(Boolean);

  return {
    balances,
    positions,
    isLoading,
    errors,
    activeFilter,
    refresh: fetchAll,
  };
}
