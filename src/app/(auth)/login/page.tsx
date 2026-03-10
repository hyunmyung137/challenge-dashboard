import LoginButtons from "@/components/auth/LoginButtons";
import Link from "next/link";

export const metadata = {
  title: "로그인 — 꺼드럭",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--black)" }}>
      {/* Back to home */}
      <div className="p-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 transition-colors"
          style={{
            fontSize: ".8rem",
            letterSpacing: ".1em",
            textTransform: "uppercase",
            color: "var(--muted)",
          }}
        >
          ← Back
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 pb-20">
        <div className="w-full max-w-sm">
          {/* Brand */}
          <div className="flex flex-col items-center gap-5 mb-10">
            <div className="logo" style={{ fontSize: "2.4rem" }}>
              꺼드<em>럭</em>
            </div>
            <p
              style={{
                fontSize: ".8rem",
                letterSpacing: ".08em",
                color: "var(--muted)",
                textAlign: "center",
                lineHeight: 1.8,
              }}
            >
              If your calls are so good — show the bag.
            </p>
          </div>

          {/* Login card */}
          <div
            className="p-6 mb-6"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            <p
              className="text-center mb-5"
              style={{
                fontSize: ".7rem",
                letterSpacing: ".15em",
                textTransform: "uppercase",
                color: "var(--muted)",
              }}
            >
              Sign in to continue
            </p>
            <LoginButtons />
          </div>

          {/* Security note */}
          <div
            className="flex items-start gap-3 p-4"
            style={{
              background: "rgba(14, 203, 129, 0.04)",
              border: "1px solid rgba(14, 203, 129, 0.12)",
            }}
          >
            <span style={{ fontSize: ".85rem" }}>🔒</span>
            <div>
              <p
                className="mb-1"
                style={{
                  fontSize: ".7rem",
                  fontWeight: 700,
                  letterSpacing: ".1em",
                  textTransform: "uppercase",
                  color: "var(--profit)",
                }}
              >
                Zero-knowledge encryption
              </p>
              <p style={{ fontSize: ".75rem", lineHeight: 1.8, color: "var(--muted)" }}>
                API keys are encrypted in your browser before reaching our servers.
                We never see your keys.
              </p>
            </div>
          </div>

          {/* Supported exchanges */}
          <div className="flex items-center justify-center gap-3 mt-8">
            {["Binance", "OKX", "Bybit", "Upbit", "Bithumb"].map((name) => (
              <span key={name} className="exch-tag" style={{ fontSize: ".65rem" }}>
                {name}
              </span>
            ))}
          </div>

          {/* Footer */}
          <p
            className="text-center mt-8"
            style={{ fontSize: ".65rem", color: "var(--muted)", opacity: 0.4 }}
          >
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
