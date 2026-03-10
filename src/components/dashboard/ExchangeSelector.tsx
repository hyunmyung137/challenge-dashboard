"use client";

import { usePortfolioStore } from "@/stores/portfolio-store";
import { useEncryptionStore, type ExchangeName } from "@/stores/encryption-store";
import { EXCHANGE_INFO } from "@/lib/exchanges";

export default function ExchangeSelector() {
  const { activeFilter, setActiveFilter, balances } = usePortfolioStore();
  const { getActiveExchanges } = useEncryptionStore();

  const activeExchanges = getActiveExchanges();

  if (activeExchanges.length <= 1) return null;

  const tabs: { value: ExchangeName | null; label: string; color?: string }[] = [
    { value: null, label: "All" },
    ...activeExchanges.map((ex) => ({
      value: ex,
      label: EXCHANGE_INFO[ex]?.label ?? ex,
      color: EXCHANGE_INFO[ex]?.color,
    })),
  ];

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1">
      {tabs.map((tab) => {
        const isActive = activeFilter === tab.value;
        const balance = tab.value
          ? balances.filter((b) => b.exchange === tab.value).reduce((s, b) => s + b.totalBalance + b.unrealizedPnl, 0)
          : null;

        return (
          <button
            key={tab.value ?? "all"}
            onClick={() => setActiveFilter(tab.value)}
            className="flex items-center gap-2 px-3 py-2 transition-colors whitespace-nowrap"
            style={{
              fontSize: ".7rem",
              fontWeight: 700,
              letterSpacing: ".08em",
              textTransform: "uppercase",
              ...(isActive
                ? { background: "var(--acid)", color: "var(--black)" }
                : {
                    background: "var(--dim)",
                    color: "var(--muted)",
                    border: "1px solid var(--border)",
                  }),
            }}
          >
            {tab.color && tab.value && (
              <div className="w-2 h-2" style={{ background: tab.color }} />
            )}
            {tab.label}
            {balance !== null && balance > 0 && (
              <span className="font-num" style={{ opacity: 0.7 }}>
                ${balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
