"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import { useEncryptionStore, type ExchangeName } from "@/stores/encryption-store";

type DayData = { date: string; dailyPnl: number; cumulativePnl: number };

const REFRESH_MS = 60 * 60 * 1000;

/**
 * Hook that fetches income (daily PNL) data from all connected exchanges
 * and aggregates them into a combined daily PNL chart dataset.
 *
 * @param days — number of days to fetch
 * @param legacyApiBase — optional legacy API base for env-var-based routes (e.g. "/api/private").
 *   When provided, a single GET request is used instead of multi-exchange POST flow.
 */
export function useIncome(days: number, legacyApiBase?: string) {
  const { isUnlocked, credentials } = useEncryptionStore();
  const [data, setData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchAll = useCallback(async () => {
    // Legacy mode: single GET request to env-var-based API
    if (legacyApiBase) {
      setLoading(true);
      try {
        const res = await fetch(`${legacyApiBase}/income?days=${days}`);
        if (!res.ok) {
          setData([]);
          return;
        }
        const result = (await res.json()) as DayData[];
        setData(result);
      } catch {
        setData([]);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Multi-exchange mode: requires unlocked credentials
    if (!isUnlocked || credentials.size === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const entries = Array.from(credentials.entries());

      // Fetch income from all exchanges in parallel
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
            return (await res.json()) as DayData[];
          } catch {
            return [];
          }
        }),
      );

      // Merge daily PNL data from all exchanges
      const mergedMap = new Map<string, number>();
      for (const exchangeData of results) {
        for (const day of exchangeData) {
          mergedMap.set(day.date, (mergedMap.get(day.date) ?? 0) + day.dailyPnl);
        }
      }

      // Rebuild with cumulative PNL
      let cumulative = 0;
      const merged = Array.from(mergedMap.entries())
        .sort((a, b) => {
          // Sort by date (try parsing "MMM DD" format)
          const da = new Date(a[0] + ", 2025");
          const db = new Date(b[0] + ", 2025");
          return da.getTime() - db.getTime();
        })
        .map(([date, dailyPnl]) => {
          cumulative += dailyPnl;
          return { date, dailyPnl, cumulativePnl: cumulative };
        });

      setData(merged);
    } catch {
      console.error("Failed to fetch income data");
    } finally {
      setLoading(false);
    }
  }, [isUnlocked, credentials, days, legacyApiBase]);

  useEffect(() => {
    fetchAll();

    intervalRef.current = setInterval(fetchAll, REFRESH_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchAll]);

  return { data, loading, refresh: fetchAll };
}
