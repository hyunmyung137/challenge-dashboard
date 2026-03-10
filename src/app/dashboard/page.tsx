"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Lock, KeyRound, Settings } from "lucide-react";
import Link from "next/link";
import Header from "@/components/layout/Header";
import PortfolioHero from "@/components/dashboard/PortfolioHero";
import DailyPNLChart from "@/components/dashboard/DailyPNLChart";
import MetricsRow from "@/components/dashboard/MetricsRow";
import PositionCards from "@/components/dashboard/PositionCards";
import PNLHistoryTable from "@/components/dashboard/PNLHistoryTable";
import ExchangeSelector from "@/components/dashboard/ExchangeSelector";
import EncryptionPasswordModal from "@/components/settings/EncryptionPasswordModal";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useEncryptionStore } from "@/stores/encryption-store";

export default function DashboardPage() {
  const { data: session } = useSession();
  const { isUnlocked, credentials } = useEncryptionStore();
  const { refresh } = usePortfolio();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [hasCredentials, setHasCredentials] = useState<boolean | null>(null);

  // Check if user has any saved credentials
  useEffect(() => {
    async function checkCredentials() {
      try {
        const res = await fetch("/api/credentials");
        if (res.ok) {
          const data = await res.json();
          setHasCredentials(data.credentials?.length > 0);
        } else {
          setHasCredentials(false);
        }
      } catch {
        setHasCredentials(false);
      }
    }
    if (session?.user) {
      checkCredentials();
    }
  }, [session]);

  // If user has credentials but hasn't unlocked, prompt for password
  const needsUnlock = hasCredentials === true && !isUnlocked;
  const noCredentials = hasCredentials === false;
  const ready = isUnlocked && credentials.size > 0;

  return (
    <>
      <Header title="꺼드럭" onRefresh={refresh} />
      <div className="flex-1 p-6 flex flex-col gap-5">
        {/* State: Loading credential check */}
        {hasCredentials === null && <LoadingState />}

        {/* State: No credentials saved */}
        {noCredentials && <EmptyState />}

        {/* State: Credentials exist but not unlocked */}
        {needsUnlock && (
          <>
            <UnlockPrompt onUnlock={() => setShowPasswordModal(true)} />
            {showPasswordModal && (
              <EncryptionPasswordModal
                mode="unlock"
                onClose={() => setShowPasswordModal(false)}
              />
            )}
          </>
        )}

        {/* State: Ready — show full dashboard */}
        {ready && (
          <>
            <ExchangeSelector />
            <PortfolioHero />
            <DailyPNLChart />
            <MetricsRow />
            <PositionCards />
            <PNLHistoryTable />
          </>
        )}
      </div>
    </>
  );
}

function LoadingState() {
  return (
    <div
      className="flex flex-col items-center justify-center py-24 gap-4 animate-fade-in"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <div
        className="w-12 h-12 border-2 rounded-full animate-spin"
        style={{ borderColor: "var(--border)", borderTopColor: "var(--acid)" }}
      />
      <p
        style={{
          fontSize: ".75rem",
          letterSpacing: ".1em",
          textTransform: "uppercase",
          color: "var(--muted)",
        }}
      >
        Loading your portfolio...
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      className="flex flex-col items-center justify-center py-24 gap-6 animate-fade-in-up"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <div
        className="flex items-center justify-center"
        style={{
          background: "var(--dim)",
          border: "1px solid var(--border)",
          width: "4.5rem",
          height: "4.5rem",
        }}
      >
        <KeyRound size={32} style={{ color: "var(--acid)" }} />
      </div>
      <div className="text-center max-w-sm">
        <h2
          className="font-display mb-2"
          style={{
            fontSize: "1.8rem",
            letterSpacing: ".04em",
            color: "var(--white)",
          }}
        >
          Connect Your Exchange
        </h2>
        <p style={{ fontSize: ".68rem", lineHeight: 1.9, color: "var(--muted)" }}>
          Add your exchange API keys in Settings to start tracking your portfolio.
          Your keys are encrypted client-side — only you can decrypt them.
        </p>
      </div>
      <Link href="/dashboard/settings" className="btn-acid">
        <Settings size={16} />
        Go to Settings
      </Link>
    </div>
  );
}

function UnlockPrompt({ onUnlock }: { onUnlock: () => void }) {
  return (
    <div
      className="flex flex-col items-center justify-center py-24 gap-6 animate-fade-in-up"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <div
        className="flex items-center justify-center"
        style={{
          background: "var(--dim)",
          border: "1px solid var(--border)",
          width: "4.5rem",
          height: "4.5rem",
        }}
      >
        <Lock size={32} style={{ color: "var(--acid)" }} />
      </div>
      <div className="text-center max-w-sm">
        <h2
          className="font-display mb-2"
          style={{
            fontSize: "1.8rem",
            letterSpacing: ".04em",
            color: "var(--white)",
          }}
        >
          Unlock Your Dashboard
        </h2>
        <p style={{ fontSize: ".68rem", lineHeight: 1.9, color: "var(--muted)" }}>
          Enter your encryption password to decrypt your API keys and load your
          portfolio.
        </p>
      </div>
      <button onClick={onUnlock} className="btn-acid">
        <Lock size={16} />
        Enter Password
      </button>
    </div>
  );
}
