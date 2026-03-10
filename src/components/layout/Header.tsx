"use client";

import { RefreshCw, LogOut, LayoutDashboard, Settings } from "lucide-react";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header({ title, onRefresh }: { title: string; onRefresh?: () => void }) {
  const { data: session } = useSession();
  const [refreshing, setRefreshing] = useState(false);
  const pathname = usePathname();

  function handleRefresh() {
    setRefreshing(true);
    onRefresh?.();
    setTimeout(() => setRefreshing(false), 800);
  }

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
  ];

  return (
    <header
      className="flex items-center justify-between px-6 py-3"
      style={{
        borderBottom: "1px solid var(--border)",
        background: "rgba(8,8,8,.94)",
        backdropFilter: "blur(12px)",
        position: "sticky",
        top: 0,
        zIndex: 200,
      }}
    >
      {/* Left: Logo + Nav */}
      <div className="flex items-center gap-6">
        <Link href="/dashboard" className="logo" style={{ fontSize: "1.3rem" }}>
          꺼드<em>럭</em>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-1.5 px-3 py-1.5 transition-colors"
                style={{
                  fontSize: ".85rem",
                  letterSpacing: ".1em",
                  textTransform: "uppercase",
                  color: isActive ? "var(--acid)" : "var(--muted)",
                  background: isActive ? "rgba(200,255,0,.06)" : "transparent",
                  borderBottom: isActive ? "1px solid var(--acid)" : "1px solid transparent",
                }}
              >
                <item.icon size={14} />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Right: User + Actions */}
      <div className="flex items-center gap-2">
        {/* User badge */}
        {session?.user && (
          <div
            className="flex items-center gap-2 px-3 py-1.5"
            style={{
              fontSize: ".8rem",
              letterSpacing: ".08em",
              background: "var(--surface)",
              color: "var(--muted)",
              border: "1px solid var(--border)",
            }}
          >
            {session.user.image ? (
              <img src={session.user.image} alt="" className="w-4 h-4 rounded-full" />
            ) : (
              <span className="w-2 h-2 rounded-full" style={{ background: "var(--profit)" }} />
            )}
            <span className="hidden sm:inline">{session.user.name ?? session.user.email}</span>
          </div>
        )}

        {/* Refresh */}
        <button
          onClick={handleRefresh}
          className="w-8 h-8 flex items-center justify-center transition-colors"
          style={{ color: "var(--muted)" }}
          title="Refresh data"
          onMouseEnter={(e) => { e.currentTarget.style.color = "var(--acid)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "var(--muted)"; }}
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
        </button>

        {/* Sign out */}
        {session && (
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-8 h-8 flex items-center justify-center transition-colors"
            style={{ color: "var(--muted)" }}
            title="Sign out"
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--red)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--muted)"; }}
          >
            <LogOut size={14} />
          </button>
        )}
      </div>
    </header>
  );
}
