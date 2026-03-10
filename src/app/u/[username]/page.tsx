import Link from "next/link";
import { notFound } from "next/navigation";
import { formatPnl, formatUSD } from "@/lib/utils";

interface Snapshot {
  totalValue: number;
  totalUnrealizedPnl: number;
  positions: Array<{
    exchange: string;
    symbol: string;
    side: string;
    unrealizedPnl: number;
    roe: number;
    entryPrice: number;
    markPrice: number;
    leverage: number;
    marginType: string;
    size: number;
    notionalValue: number;
  }>;
  balances: Array<{
    exchange: string;
    totalBalance: number;
    unrealizedPnl: number;
  }>;
}

async function getPublicData(username: string) {
  const baseUrl = process.env.NEXTAUTH_URL ?? process.env.VERCEL_URL ?? "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/public/${username}`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

export default async function PublicDashboard({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const data = await getPublicData(username);

  if (!data) notFound();

  const { user, snapshot, updated_at } = data as {
    user: { display_name: string; username: string };
    snapshot: Snapshot;
    updated_at: string;
  };

  const totalValue = snapshot.totalValue ?? 0;
  const totalPnl = snapshot.totalUnrealizedPnl ?? 0;
  const positions = snapshot.positions ?? [];
  const balances = snapshot.balances ?? [];

  return (
    <div className="min-h-screen" style={{ background: "var(--black)" }}>
      {/* Header */}
      <header
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <div>
          <div className="flex items-center gap-3">
            <Link href="/" className="logo" style={{ fontSize: "1.3rem", textDecoration: "none" }}>
              꺼드<em>럭</em>
            </Link>
            <span style={{ color: "var(--border)" }}>/</span>
            <span
              className="font-display"
              style={{ fontSize: "1.1rem", color: "var(--white)" }}
            >
              @{user.username}
            </span>
          </div>
          <p style={{ fontSize: ".65rem", color: "var(--muted)", marginTop: "2px" }}>
            {user.display_name} — Updated {new Date(updated_at).toLocaleString()}
          </p>
        </div>
        <div
          className="flex items-center gap-2 px-3 py-1.5"
          style={{
            fontSize: ".6rem",
            fontWeight: 700,
            letterSpacing: ".08em",
            textTransform: "uppercase",
            background: "var(--dim)",
            color: "var(--muted)",
            border: "1px solid var(--border)",
          }}
        >
          <div
            className="w-1.5 h-1.5"
            style={{ background: "var(--profit)", animation: "pulse 2s infinite" }}
          />
          Public Dashboard
        </div>
      </header>

      <div className="p-6 flex flex-col gap-5 max-w-5xl mx-auto">
        {/* Portfolio Value */}
        <div className="p-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <p
            style={{
              fontSize: ".65rem",
              fontWeight: 700,
              letterSpacing: ".1em",
              textTransform: "uppercase",
              color: "var(--muted)",
              marginBottom: "6px",
            }}
          >
            Total Portfolio Value
          </p>
          <p
            className="font-display"
            style={{ fontSize: "2.2rem", color: "var(--white)", lineHeight: 1 }}
          >
            {formatUSD(totalValue)}
          </p>
          {totalPnl !== 0 && (
            <p
              className="font-num"
              style={{
                fontSize: ".75rem",
                fontWeight: 700,
                color: totalPnl >= 0 ? "var(--profit)" : "var(--red)",
                marginTop: "6px",
              }}
            >
              {formatPnl(totalPnl)} unrealized
            </p>
          )}

          {/* Per-exchange breakdown */}
          {balances.length > 1 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              {balances.map((b, i) => (
                <div
                  key={i}
                  className="px-3 py-2"
                  style={{ background: "var(--dim)", border: "1px solid var(--border)" }}
                >
                  <p
                    style={{
                      fontSize: ".6rem",
                      fontWeight: 700,
                      letterSpacing: ".08em",
                      textTransform: "uppercase",
                      color: "var(--muted)",
                    }}
                  >
                    {b.exchange}
                  </p>
                  <p
                    className="font-num"
                    style={{ fontSize: ".75rem", fontWeight: 700, color: "var(--white)", marginTop: "2px" }}
                  >
                    {formatUSD(b.totalBalance + b.unrealizedPnl)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Open Positions */}
        {positions.length > 0 && (
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="px-5 py-3.5 border-b" style={{ borderColor: "var(--border)" }}>
              <span
                style={{
                  fontSize: ".7rem",
                  fontWeight: 700,
                  letterSpacing: ".08em",
                  textTransform: "uppercase",
                  color: "var(--white)",
                }}
              >
                Open Positions
              </span>
              <span
                className="ml-2 px-2 py-0.5 font-num"
                style={{
                  fontSize: ".6rem",
                  fontWeight: 700,
                  background: "var(--dim)",
                  color: "var(--muted)",
                }}
              >
                {positions.length}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4">
              {positions.map((pos, i) => {
                const isLong = pos.side === "LONG";
                const sideColor = isLong ? "var(--profit)" : pos.side === "SHORT" ? "var(--red)" : "var(--acid)";
                return (
                  <div
                    key={i}
                    className="p-4"
                    style={{ background: "var(--dim)", border: "1px solid var(--border)" }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span
                          style={{ fontSize: ".7rem", fontWeight: 700, color: "var(--white)" }}
                        >
                          {pos.symbol.replace("USDT", "")}
                        </span>
                        <span
                          className="px-1.5 py-0.5"
                          style={{
                            fontSize: ".55rem",
                            fontWeight: 700,
                            letterSpacing: ".05em",
                            background: `color-mix(in srgb, ${isLong ? "var(--profit)" : "var(--red)"} 12%, transparent)`,
                            color: sideColor,
                          }}
                        >
                          {pos.side}
                        </span>
                        {pos.leverage > 1 && (
                          <span
                            className="px-1.5 py-0.5"
                            style={{
                              fontSize: ".55rem",
                              fontWeight: 700,
                              background: "rgba(200,255,0,0.08)",
                              color: "var(--acid)",
                            }}
                          >
                            {pos.leverage}x
                          </span>
                        )}
                        <span
                          className="px-1.5 py-0.5"
                          style={{
                            fontSize: ".55rem",
                            fontWeight: 700,
                            letterSpacing: ".05em",
                            textTransform: "uppercase",
                            background: "var(--surface)",
                            color: "var(--muted)",
                          }}
                        >
                          {pos.exchange}
                        </span>
                      </div>
                    </div>
                    <p
                      className="font-display"
                      style={{
                        fontSize: "1.2rem",
                        color: pos.unrealizedPnl >= 0 ? "var(--profit)" : "var(--red)",
                        lineHeight: 1,
                      }}
                    >
                      {formatPnl(pos.unrealizedPnl)}
                      <span className="font-num" style={{ fontSize: ".6rem", marginLeft: "4px" }}>
                        ({pos.roe >= 0 ? "+" : ""}{pos.roe.toFixed(2)}%)
                      </span>
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-6">
          <p style={{ fontSize: ".65rem", color: "var(--muted)" }}>
            🔒 Read-only API · Zero-knowledge encrypted · Powered by{" "}
            <Link href="/" style={{ color: "var(--acid)", textDecoration: "none" }}>
              꺼드럭
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
