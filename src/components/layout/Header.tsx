"use client";

import { RefreshCw } from "lucide-react";
import { useState } from "react";

export default function Header({ title }: { title: string }) {
  const [refreshing, setRefreshing] = useState(false);

  function handleRefresh() {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b"
      style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
      <h1 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
        {title}
      </h1>
      <div className="flex items-center gap-3">
        {/* Account badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
          style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}>
          <span className="w-2 h-2 rounded-full bg-[#0ECB81]" />
          Main Account
        </div>

        {/* Refresh */}
        <button onClick={handleRefresh}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--bg-elevated)]"
          style={{ color: "var(--text-secondary)" }}>
          <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
        </button>
      </div>
    </header>
  );
}
