import { create } from "zustand";
import type { EncryptedPayload } from "@/lib/crypto";

export type ExchangeName = "binance" | "okx" | "bybit" | "upbit" | "bithumb";

export interface DecryptedCredentials {
  apiKey: string;
  apiSecret: string;
  passphrase?: string;
}

interface EncryptionState {
  /** Whether the user has entered their encryption password this session */
  isUnlocked: boolean;

  /** Decrypted credentials in memory, keyed by "exchange:label" */
  credentials: Map<string, DecryptedCredentials>;

  /** Set the unlocked state (after password verified) */
  unlock: () => void;

  /** Lock and clear all decrypted credentials from memory */
  lock: () => void;

  /** Store a decrypted credential in memory */
  setCredential: (exchange: ExchangeName, label: string, creds: DecryptedCredentials) => void;

  /** Get a decrypted credential from memory */
  getCredential: (exchange: ExchangeName, label: string) => DecryptedCredentials | undefined;

  /** Remove a credential from memory */
  removeCredential: (exchange: ExchangeName, label: string) => void;

  /** Get all exchange names that have decrypted credentials */
  getActiveExchanges: () => ExchangeName[];
}

function credKey(exchange: string, label: string) {
  return `${exchange}:${label}`;
}

/**
 * In-memory only store for decrypted exchange credentials.
 * NEVER persisted to localStorage, sessionStorage, or cookies.
 * Cleared on page refresh or when user locks.
 */
export const useEncryptionStore = create<EncryptionState>((set, get) => ({
  isUnlocked: false,
  credentials: new Map(),

  unlock: () => set({ isUnlocked: true }),

  lock: () =>
    set({
      isUnlocked: false,
      credentials: new Map(),
    }),

  setCredential: (exchange, label, creds) => {
    const next = new Map(get().credentials);
    next.set(credKey(exchange, label), creds);
    set({ credentials: next });
  },

  getCredential: (exchange, label) => {
    return get().credentials.get(credKey(exchange, label));
  },

  removeCredential: (exchange, label) => {
    const next = new Map(get().credentials);
    next.delete(credKey(exchange, label));
    set({ credentials: next });
  },

  getActiveExchanges: () => {
    const exchanges = new Set<ExchangeName>();
    for (const key of get().credentials.keys()) {
      exchanges.add(key.split(":")[0] as ExchangeName);
    }
    return Array.from(exchanges);
  },
}));
