"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Header from "@/components/layout/Header";
import CredentialForm from "@/components/settings/CredentialForm";
import CredentialList from "@/components/settings/CredentialList";
import ProfileSettings from "@/components/settings/ProfileSettings";
import EncryptionPasswordModal from "@/components/settings/EncryptionPasswordModal";
import { useEncryptionStore, type ExchangeName } from "@/stores/encryption-store";
import { encryptCredentials } from "@/lib/crypto";

interface CredentialMeta {
  id: string;
  exchange: string;
  label: string;
  last_accessed_at: string;
  created_at: string;
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const { isUnlocked, unlock } = useEncryptionStore();

  const [credentials, setCredentials] = useState<CredentialMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [encryptionPassword, setEncryptionPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Pending save data — used when user needs to set password first
  const [pendingSave, setPendingSave] = useState<{
    exchange: ExchangeName;
    label: string;
    apiKey: string;
    apiSecret: string;
    passphrase?: string;
  } | null>(null);

  const fetchCredentials = useCallback(async () => {
    try {
      const res = await fetch("/api/credentials");
      if (res.ok) {
        setCredentials(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch credentials:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  const handleSaveCredential = async (data: {
    exchange: ExchangeName;
    label: string;
    apiKey: string;
    apiSecret: string;
    passphrase?: string;
  }) => {
    // If no encryption password set yet, prompt for one
    if (!encryptionPassword) {
      setPendingSave(data);
      setShowPasswordModal(true);
      return;
    }

    setSaving(true);
    try {
      // Encrypt credentials client-side
      const { ciphertext, iv, salt } = await encryptCredentials(
        {
          apiKey: data.apiKey,
          apiSecret: data.apiSecret,
          passphrase: data.passphrase,
        },
        encryptionPassword,
      );

      // Send encrypted blob to server
      const res = await fetch("/api/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exchange: data.exchange,
          label: data.label,
          encrypted_blob: ciphertext,
          iv,
          salt,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save credential");
      }

      // Refresh the list
      await fetchCredentials();
    } catch (err) {
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCredential = async (id: string) => {
    const res = await fetch(`/api/credentials?id=${id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to delete credential");
    }
    await fetchCredentials();
  };

  const handlePasswordSubmit = async (password: string) => {
    setPasswordError("");
    setEncryptionPassword(password);
    unlock();
    setShowPasswordModal(false);

    // If there was a pending save, process it now
    if (pendingSave) {
      try {
        // We need to manually run the save with the new password since state may not have updated
        setSaving(true);
        const { ciphertext, iv, salt } = await encryptCredentials(
          {
            apiKey: pendingSave.apiKey,
            apiSecret: pendingSave.apiSecret,
            passphrase: pendingSave.passphrase,
          },
          password,
        );

        const res = await fetch("/api/credentials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            exchange: pendingSave.exchange,
            label: pendingSave.label,
            encrypted_blob: ciphertext,
            iv,
            salt,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to save credential");
        }

        await fetchCredentials();
      } catch (err) {
        console.error("Failed to save pending credential:", err);
      } finally {
        setSaving(false);
        setPendingSave(null);
      }
    }
  };

  return (
    <>
      <Header title="Settings" />
      <div className="flex-1 p-6 flex flex-col gap-5 max-w-3xl mx-auto w-full">
        {/* Encryption Status */}
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{
            background: isUnlocked ? "rgba(14,203,129,0.06)" : "rgba(200,255,0,0.04)",
            border: `1px solid ${isUnlocked ? "rgba(14,203,129,0.15)" : "var(--border)"}`,
          }}
        >
          <span style={{ fontSize: "1.1rem" }}>{isUnlocked ? "🔓" : "🔒"}</span>
          <div>
            <p
              style={{
                fontSize: ".7rem",
                fontWeight: 700,
                letterSpacing: ".08em",
                textTransform: "uppercase",
                color: isUnlocked ? "var(--profit)" : "var(--acid)",
              }}
            >
              {isUnlocked ? "Credentials Unlocked" : "Credentials Locked"}
            </p>
            <p style={{ fontSize: ".68rem", color: "var(--muted)", marginTop: "2px" }}>
              {isUnlocked
                ? "Your encryption password is active for this session."
                : "Enter your encryption password to decrypt keys for dashboard use."}
            </p>
          </div>
          {!isUnlocked && credentials.length > 0 && (
            <button
              onClick={() => setShowPasswordModal(true)}
              className="ml-auto px-4 py-2"
              style={{
                fontSize: ".65rem",
                fontWeight: 700,
                letterSpacing: ".08em",
                textTransform: "uppercase",
                background: "var(--acid)",
                color: "var(--black)",
              }}
            >
              Unlock
            </button>
          )}
        </div>

        {/* Credential Form */}
        <CredentialForm onSave={handleSaveCredential} saving={saving} />

        {/* Credential List */}
        {loading ? (
          <div className="h-20 animate-pulse" style={{ background: "var(--surface)" }} />
        ) : (
          <CredentialList credentials={credentials} onDelete={handleDeleteCredential} />
        )}

        {/* Profile Settings */}
        <ProfileSettings />

        {/* Encryption Password Modal */}
        {showPasswordModal && (
          <EncryptionPasswordModal
            mode={credentials.length === 0 && !isUnlocked ? "set" : "unlock"}
            onSubmit={handlePasswordSubmit}
            onClose={() => {
              setShowPasswordModal(false);
              setPendingSave(null);
            }}
            error={passwordError}
          />
        )}
      </div>
    </>
  );
}
