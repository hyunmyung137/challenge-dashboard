"use client";

import { useState } from "react";
import { useEncryptionStore } from "@/stores/encryption-store";
import { decryptCredentials, type EncryptedPayload } from "@/lib/crypto";
import type { ExchangeName } from "@/stores/encryption-store";

interface EncryptionPasswordModalProps {
  mode: "set" | "unlock";
  onClose: () => void;
  onSubmit?: (password: string) => void;
  error?: string;
}

/**
 * Modal for setting or unlocking the encryption password.
 *
 * In "unlock" mode, it automatically fetches saved credentials,
 * decrypts them, and stores them in the encryption store.
 */
export default function EncryptionPasswordModal({
  mode,
  onClose,
  onSubmit,
  error: externalError,
}: EncryptionPasswordModalProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState("");
  const [isDecrypting, setIsDecrypting] = useState(false);

  const { unlock, setCredential } = useEncryptionStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");

    if (!password) {
      setLocalError("Password is required");
      return;
    }

    if (mode === "set") {
      if (password.length < 8) {
        setLocalError("Password must be at least 8 characters");
        return;
      }
      if (password !== confirmPassword) {
        setLocalError("Passwords do not match");
        return;
      }
      onSubmit?.(password);
      setPassword("");
      setConfirmPassword("");
      return;
    }

    // Unlock mode: fetch credentials list, then decrypt each one
    setIsDecrypting(true);
    try {
      const res = await fetch("/api/credentials");
      if (!res.ok) {
        throw new Error("Failed to fetch credentials");
      }
      const { credentials } = await res.json();

      if (!credentials || credentials.length === 0) {
        setLocalError("No credentials found");
        setIsDecrypting(false);
        return;
      }

      // Fetch and decrypt each credential
      let decryptedCount = 0;
      for (const cred of credentials) {
        try {
          // Fetch the actual encrypted blob
          const blobRes = await fetch(`/api/credentials?exchange=${cred.exchange}&label=${cred.label}`);
          if (!blobRes.ok) continue;
          const blobData = await blobRes.json();

          if (!blobData.encrypted_blob) continue;

          // Parse the blob (base64 JSON) and decrypt
          const payload: EncryptedPayload = JSON.parse(
            typeof blobData.encrypted_blob === "string"
              ? blobData.encrypted_blob
              : new TextDecoder().decode(new Uint8Array(blobData.encrypted_blob)),
          );

          const decrypted = await decryptCredentials(payload, password);
          setCredential(cred.exchange as ExchangeName, cred.label, decrypted);
          decryptedCount++;
        } catch (err) {
          console.error(`Failed to decrypt ${cred.exchange}:${cred.label}:`, err);
        }
      }

      if (decryptedCount === 0) {
        setLocalError("Decryption failed. Incorrect password?");
        setIsDecrypting(false);
        return;
      }

      unlock();
      onClose();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsDecrypting(false);
    }
  };

  const displayError = externalError || localError;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,.7)", backdropFilter: "blur(6px)" }}>
      <div
        className="w-full max-w-md p-6"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <p
          className="font-display"
          style={{
            fontSize: "1.4rem",
            color: "var(--white)",
            marginBottom: "4px",
          }}
        >
          {mode === "set" ? "SET ENCRYPTION PASSWORD" : "UNLOCK CREDENTIALS"}
        </p>
        <p style={{ fontSize: ".7rem", color: "var(--muted)", marginBottom: "1.2rem" }}>
          {mode === "set"
            ? "This password encrypts your API keys. It is never stored — if lost, you'll need to re-enter your keys."
            : "Enter your encryption password to decrypt your API keys."}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label style={labelStyle}>Encryption Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
              autoFocus
              placeholder={mode === "set" ? "Min. 8 characters" : "Enter your password"}
              disabled={isDecrypting}
            />
          </div>

          {mode === "set" && (
            <div>
              <label style={labelStyle}>Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={inputStyle}
                placeholder="Re-enter password"
                disabled={isDecrypting}
              />
            </div>
          )}

          {displayError && (
            <p style={{ fontSize: ".7rem", fontWeight: 700, color: "var(--red)" }}>
              {displayError}
            </p>
          )}

          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5"
              style={{
                fontSize: ".7rem",
                fontWeight: 700,
                letterSpacing: ".08em",
                textTransform: "uppercase",
                background: "var(--dim)",
                color: "var(--muted)",
                border: "1px solid var(--border)",
              }}
              disabled={isDecrypting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 flex items-center justify-center gap-2"
              style={{
                fontSize: ".7rem",
                fontWeight: 700,
                letterSpacing: ".08em",
                textTransform: "uppercase",
                background: "var(--acid)",
                color: "var(--black)",
              }}
              disabled={isDecrypting}
            >
              {isDecrypting ? (
                <>
                  <div
                    className="w-3 h-3 border-2 animate-spin"
                    style={{ borderColor: "rgba(0,0,0,.2)", borderTopColor: "var(--black)" }}
                  />
                  Decrypting...
                </>
              ) : mode === "set" ? (
                "Set Password"
              ) : (
                "Unlock"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
