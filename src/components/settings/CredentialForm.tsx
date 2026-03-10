"use client";

import { useState } from "react";
import type { ExchangeName } from "@/stores/encryption-store";

const EXCHANGES: { value: ExchangeName; label: string; needsPassphrase: boolean }[] = [
  { value: "binance", label: "Binance Futures", needsPassphrase: false },
  { value: "okx", label: "OKX", needsPassphrase: true },
  { value: "bybit", label: "Bybit", needsPassphrase: false },
  { value: "upbit", label: "Upbit (Spot)", needsPassphrase: false },
  { value: "bithumb", label: "Bithumb (Spot)", needsPassphrase: false },
];

interface CredentialFormProps {
  onSave: (data: {
    exchange: ExchangeName;
    label: string;
    apiKey: string;
    apiSecret: string;
    passphrase?: string;
  }) => Promise<void>;
  saving: boolean;
}

export default function CredentialForm({ onSave, saving }: CredentialFormProps) {
  const [exchange, setExchange] = useState<ExchangeName>("binance");
  const [label, setLabel] = useState("Main Account");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState("");

  const needsPassphrase = EXCHANGES.find((e) => e.value === exchange)?.needsPassphrase ?? false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!apiKey.trim() || !apiSecret.trim()) {
      setError("API Key and Secret are required");
      return;
    }

    if (needsPassphrase && !passphrase.trim()) {
      setError("Passphrase is required for this exchange");
      return;
    }

    try {
      await onSave({
        exchange,
        label: label.trim() || "Main Account",
        apiKey: apiKey.trim(),
        apiSecret: apiSecret.trim(),
        passphrase: needsPassphrase ? passphrase.trim() : undefined,
      });
      // Reset form on success
      setApiKey("");
      setApiSecret("");
      setPassphrase("");
    } catch (err) {
      setError(String(err));
    }
  };

  const labelStyle: React.CSSProperties = {
    fontSize: ".75rem",
    fontWeight: 700,
    letterSpacing: ".1em",
    textTransform: "uppercase",
    color: "var(--muted)",
    marginBottom: "4px",
    display: "block",
  };

  const inputStyle: React.CSSProperties = {
    background: "var(--dim)",
    color: "var(--white)",
    border: "1px solid var(--border)",
    fontSize: ".85rem",
    padding: ".5rem .75rem",
    width: "100%",
    outline: "none",
  };

  return (
    <div className="p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <p
        style={{
          fontSize: ".75rem",
          fontWeight: 700,
          letterSpacing: ".08em",
          textTransform: "uppercase",
          color: "var(--white)",
          marginBottom: "1rem",
        }}
      >
        Add Exchange API Keys
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label style={labelStyle}>Exchange</label>
            <select
              value={exchange}
              onChange={(e) => setExchange(e.target.value as ExchangeName)}
              className="cursor-pointer"
              style={inputStyle}
            >
              {EXCHANGES.map((ex) => (
                <option key={ex.value} value={ex.value}>
                  {ex.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Label</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              style={inputStyle}
              placeholder="Main Account"
            />
          </div>
        </div>

        <div>
          <label style={labelStyle}>API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="font-mono"
            style={inputStyle}
            placeholder="Enter your API key"
          />
        </div>

        <div>
          <label style={labelStyle}>API Secret</label>
          <input
            type="password"
            value={apiSecret}
            onChange={(e) => setApiSecret(e.target.value)}
            className="font-mono"
            style={inputStyle}
            placeholder="Enter your API secret"
          />
        </div>

        {needsPassphrase && (
          <div>
            <label style={labelStyle}>
              Passphrase{" "}
              <span style={{ opacity: 0.5 }}>(required for {exchange.toUpperCase()})</span>
            </label>
            <input
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              className="font-mono"
              style={inputStyle}
              placeholder="Enter your passphrase"
            />
          </div>
        )}

        {error && (
          <p style={{ fontSize: ".7rem", fontWeight: 700, color: "var(--red)" }}>{error}</p>
        )}

        <div className="flex items-center gap-3 mt-1">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 transition-opacity disabled:opacity-50"
            style={{
              fontSize: ".7rem",
              fontWeight: 700,
              letterSpacing: ".08em",
              textTransform: "uppercase",
              background: "var(--acid)",
              color: "var(--black)",
            }}
          >
            {saving ? "Encrypting..." : "Encrypt & Save"}
          </button>
          <p style={{ fontSize: ".75rem", color: "var(--muted)" }}>
            🔒 Encrypted in your browser. Server only stores encrypted blobs.
          </p>
        </div>
      </form>
    </div>
  );
}
