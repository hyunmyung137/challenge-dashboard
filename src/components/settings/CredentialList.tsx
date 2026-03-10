"use client";

import { useState } from "react";

interface Credential {
  id: string;
  exchange: string;
  label: string;
  last_accessed_at: string;
  created_at: string;
}

const EXCHANGE_LABELS: Record<string, string> = {
  binance: "Binance Futures",
  okx: "OKX",
  bybit: "Bybit",
  upbit: "Upbit",
  bithumb: "Bithumb",
};

const EXCHANGE_COLORS: Record<string, string> = {
  binance: "#F0B90B",
  okx: "#fff",
  bybit: "#F7A600",
  upbit: "#093687",
  bithumb: "#F28C28",
};

interface CredentialListProps {
  credentials: Credential[];
  onDelete: (id: string) => Promise<void>;
}

export default function CredentialList({ credentials, onDelete }: CredentialListProps) {
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure? You'll need to re-enter your API keys.")) return;
    setDeleting(id);
    try {
      await onDelete(id);
    } finally {
      setDeleting(null);
    }
  };

  if (credentials.length === 0) {
    return (
      <div className="p-8 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <p
          style={{
            fontSize: ".7rem",
            letterSpacing: ".1em",
            textTransform: "uppercase",
            color: "var(--muted)",
          }}
        >
          No exchange credentials saved yet. Add your first exchange above.
        </p>
      </div>
    );
  }

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="px-5 py-3.5 border-b" style={{ borderColor: "var(--border)" }}>
        <span
          style={{
            fontSize: ".75rem",
            fontWeight: 700,
            letterSpacing: ".08em",
            textTransform: "uppercase",
            color: "var(--white)",
          }}
        >
          Saved Credentials
        </span>
        <span
          className="ml-2 px-2 py-0.5 font-num"
          style={{
            fontSize: ".75rem",
            fontWeight: 700,
            background: "var(--dim)",
            color: "var(--muted)",
          }}
        >
          {credentials.length}
        </span>
      </div>

      <div>
        {credentials.map((cred, i) => (
          <div
            key={cred.id}
            className="flex items-center justify-between px-5 py-3.5"
            style={i > 0 ? { borderTop: "1px solid rgba(255,255,255,0.04)" } : undefined}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 flex items-center justify-center"
                style={{
                  fontSize: ".75rem",
                  fontWeight: 700,
                  letterSpacing: ".05em",
                  background: `${EXCHANGE_COLORS[cred.exchange] ?? "#888"}15`,
                  color: EXCHANGE_COLORS[cred.exchange] ?? "#888",
                }}
              >
                {cred.exchange.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p style={{ fontSize: ".8rem", fontWeight: 600, color: "var(--white)" }}>
                  {EXCHANGE_LABELS[cred.exchange] ?? cred.exchange}
                </p>
                <p style={{ fontSize: ".75rem", color: "var(--muted)" }}>
                  {cred.label} — added {new Date(cred.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleDelete(cred.id)}
              disabled={deleting === cred.id}
              className="px-3 py-1.5 transition-opacity disabled:opacity-50"
              style={{
                fontSize: ".75rem",
                fontWeight: 700,
                letterSpacing: ".08em",
                textTransform: "uppercase",
                background: "rgba(255,45,45,0.08)",
                color: "var(--red)",
              }}
            >
              {deleting === cred.id ? "Deleting..." : "Remove"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
