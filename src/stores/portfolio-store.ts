import { create } from "zustand";
import type { ExchangeName } from "@/stores/encryption-store";

export interface PortfolioBalance {
  exchange: ExchangeName;
  label: string;
  totalBalance: number;
  availableBalance: number;
  unrealizedPnl: number;
}

export interface PortfolioPosition {
  exchange: ExchangeName;
  label: string;
  symbol: string;
  side: "LONG" | "SHORT" | "SPOT";
  size: number;
  entryPrice: number;
  markPrice: number;
  liquidationPrice: number;
  unrealizedPnl: number;
  roe: number;
  leverage: number;
  marginType: "cross" | "isolated" | "spot";
  notionalValue: number;
}

interface PortfolioState {
  /** Per-exchange balances */
  balances: PortfolioBalance[];

  /** All open positions across exchanges */
  positions: PortfolioPosition[];

  /** Loading state per exchange */
  loading: Map<string, boolean>;

  /** Error state per exchange */
  errors: Map<string, string>;

  /** Active exchange filter (null = show all) */
  activeFilter: ExchangeName | null;

  /** Last fetch timestamp */
  lastUpdated: number | null;

  // Actions
  setBalances: (balances: PortfolioBalance[]) => void;
  setPositions: (positions: PortfolioPosition[]) => void;
  setLoading: (exchange: string, loading: boolean) => void;
  setError: (exchange: string, error: string | null) => void;
  setActiveFilter: (filter: ExchangeName | null) => void;
  setLastUpdated: (ts: number) => void;
  reset: () => void;

  // Computed
  getTotalValue: () => number;
  getTotalUnrealizedPnl: () => number;
  getFilteredPositions: () => PortfolioPosition[];
  getFilteredBalances: () => PortfolioBalance[];
}

export const usePortfolioStore = create<PortfolioState>((set, get) => ({
  balances: [],
  positions: [],
  loading: new Map(),
  errors: new Map(),
  activeFilter: null,
  lastUpdated: null,

  setBalances: (balances) => set({ balances }),
  setPositions: (positions) => set({ positions }),
  setLoading: (exchange, loading) => {
    const next = new Map(get().loading);
    next.set(exchange, loading);
    set({ loading: next });
  },
  setError: (exchange, error) => {
    const next = new Map(get().errors);
    if (error) next.set(exchange, error);
    else next.delete(exchange);
    set({ errors: next });
  },
  setActiveFilter: (filter) => set({ activeFilter: filter }),
  setLastUpdated: (ts) => set({ lastUpdated: ts }),
  reset: () =>
    set({
      balances: [],
      positions: [],
      loading: new Map(),
      errors: new Map(),
      activeFilter: null,
      lastUpdated: null,
    }),

  getTotalValue: () => {
    return get().balances.reduce((sum, b) => sum + b.totalBalance + b.unrealizedPnl, 0);
  },

  getTotalUnrealizedPnl: () => {
    return get().balances.reduce((sum, b) => sum + b.unrealizedPnl, 0);
  },

  getFilteredPositions: () => {
    const { positions, activeFilter } = get();
    if (!activeFilter) return positions;
    return positions.filter((p) => p.exchange === activeFilter);
  },

  getFilteredBalances: () => {
    const { balances, activeFilter } = get();
    if (!activeFilter) return balances;
    return balances.filter((b) => b.exchange === activeFilter);
  },
}));
