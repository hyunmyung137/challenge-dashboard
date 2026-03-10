"use client";

import { useState, useEffect } from "react";

interface Profile {
  display_name: string;
  username_slug: string | null;
  is_public: boolean;
}

export default function ProfileSettings() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/user/profile")
      .then((res) => res.json())
      .then((data) => {
        setProfile(data);
        setDisplayName(data.display_name ?? "");
        setUsername(data.username_slug ?? "");
        setIsPublic(data.is_public ?? false);
      })
      .catch(console.error);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName,
          username_slug: username || null,
          is_public: isPublic,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update profile");
      }

      const data = await res.json();
      setProfile(data);
      setMessage({ type: "success", text: "Profile updated!" });
    } catch (err) {
      setMessage({ type: "error", text: String(err) });
    } finally {
      setSaving(false);
    }
  };

  if (!profile) {
    return (
      <div className="p-5 animate-pulse" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="h-6 w-40" style={{ background: "var(--dim)" }} />
      </div>
    );
  }

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
        Profile Settings
      </p>

      <div className="flex flex-col gap-3">
        <div>
          <label style={labelStyle}>Display Name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>
            Public Username{" "}
            <span style={{ opacity: 0.5 }}>(for kkeo.dk/@you)</span>
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
            className="font-mono"
            style={inputStyle}
            placeholder="your-username"
          />
          <p style={{ fontSize: ".7rem", color: "var(--muted)", marginTop: "4px", opacity: 0.6 }}>
            3-30 characters: lowercase letters, numbers, hyphens, underscores
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPublic(!isPublic)}
            className="w-10 h-5 relative transition-colors"
            style={{ background: isPublic ? "var(--profit)" : "var(--dim)", border: "1px solid var(--border)" }}
          >
            <div
              className="w-4 h-4 absolute top-0.5 transition-all"
              style={{
                background: isPublic ? "var(--black)" : "var(--muted)",
                left: isPublic ? "calc(100% - 1.125rem)" : "0.125rem",
              }}
            />
          </button>
          <span
            style={{
              fontSize: ".7rem",
              fontWeight: 600,
              letterSpacing: ".05em",
              textTransform: "uppercase",
              color: "var(--white)",
            }}
          >
            Make portfolio public
          </span>
        </div>

        {isPublic && username && (
          <p
            className="px-3 py-2"
            style={{
              fontSize: ".7rem",
              background: "rgba(14,203,129,0.06)",
              color: "var(--profit)",
              border: "1px solid rgba(14,203,129,0.15)",
            }}
          >
            Your dashboard will be visible at{" "}
            <span className="font-mono font-bold">kkeo.dk/@{username}</span>
          </p>
        )}

        {message && (
          <p
            style={{
              fontSize: ".7rem",
              fontWeight: 700,
              color: message.type === "success" ? "var(--profit)" : "var(--red)",
            }}
          >
            {message.text}
          </p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="self-start px-5 py-2.5 transition-opacity disabled:opacity-50 mt-1"
          style={{
            fontSize: ".7rem",
            fontWeight: 700,
            letterSpacing: ".08em",
            textTransform: "uppercase",
            background: "var(--acid)",
            color: "var(--black)",
          }}
        >
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </div>
    </div>
  );
}
