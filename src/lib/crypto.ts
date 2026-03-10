/**
 * Zero-knowledge client-side encryption using Web Crypto API.
 *
 * - AES-256-GCM for symmetric encryption
 * - PBKDF2 with 600,000 iterations for key derivation from password
 * - All operations happen in the browser — server never sees plaintext keys
 *
 * If the encryption password is lost, keys are unrecoverable.
 * Users simply re-enter their exchange API keys.
 */

const PBKDF2_ITERATIONS = 600_000;
const KEY_LENGTH = 256; // bits
const SALT_LENGTH = 16; // bytes
const IV_LENGTH = 12; // bytes (96 bits for GCM)

/**
 * Derive an AES-256-GCM key from a password using PBKDF2.
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    passwordBuffer.buffer as ArrayBuffer,
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt.buffer as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"],
  );
}

/**
 * Convert Uint8Array to base64 string for JSON storage.
 */
function toBase64(buffer: Uint8Array): string {
  return btoa(String.fromCharCode(...buffer));
}

/**
 * Convert base64 string back to Uint8Array.
 */
function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export interface EncryptedPayload {
  ciphertext: string; // base64
  iv: string; // base64
  salt: string; // base64
}

/**
 * Encrypt plaintext with a password.
 *
 * @param plaintext - The text to encrypt (typically JSON-stringified credentials)
 * @param password - The user's encryption password
 * @returns Encrypted payload with ciphertext, IV, and salt (all base64-encoded)
 */
export async function encrypt(plaintext: string, password: string): Promise<EncryptedPayload> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const key = await deriveKey(password, salt);

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
    key,
    encoder.encode(plaintext),
  );

  return {
    ciphertext: toBase64(new Uint8Array(encrypted)),
    iv: toBase64(iv),
    salt: toBase64(salt),
  };
}

/**
 * Decrypt an encrypted payload with a password.
 *
 * @param payload - The encrypted payload (ciphertext, IV, salt)
 * @param password - The user's encryption password
 * @returns Decrypted plaintext
 * @throws Error if the password is incorrect or data is corrupted
 */
export async function decrypt(payload: EncryptedPayload, password: string): Promise<string> {
  const { ciphertext, iv, salt } = payload;
  const decoder = new TextDecoder();

  const key = await deriveKey(password, fromBase64(salt));

  try {
    const ivBytes = fromBase64(iv);
    const ciphertextBytes = fromBase64(ciphertext);
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: ivBytes.buffer as ArrayBuffer },
      key,
      ciphertextBytes.buffer as ArrayBuffer,
    );
    return decoder.decode(decrypted);
  } catch {
    throw new Error("Decryption failed. Incorrect password or corrupted data.");
  }
}

/**
 * Encrypt exchange credentials.
 *
 * @param credentials - Object with apiKey, apiSecret, and optional passphrase
 * @param password - The user's encryption password
 */
export async function encryptCredentials(
  credentials: { apiKey: string; apiSecret: string; passphrase?: string },
  password: string,
): Promise<EncryptedPayload> {
  return encrypt(JSON.stringify(credentials), password);
}

/**
 * Decrypt exchange credentials.
 *
 * @param payload - The encrypted payload
 * @param password - The user's encryption password
 * @returns Decrypted credentials object
 */
export async function decryptCredentials(
  payload: EncryptedPayload,
  password: string,
): Promise<{ apiKey: string; apiSecret: string; passphrase?: string }> {
  const plaintext = await decrypt(payload, password);
  return JSON.parse(plaintext);
}
