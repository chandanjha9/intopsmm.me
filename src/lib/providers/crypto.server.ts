/**
 * AES-256-GCM encryption for provider API keys.
 * Server-only: reads PROVIDER_ENCRYPTION_KEY from the runtime environment.
 * Format: v1.<base64 iv>.<base64 ciphertext>
 */

const PREFIX = "v1";
const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function getKey(): Promise<CryptoKey> {
  const secret = process.env.PROVIDER_ENCRYPTION_KEY;
  if (!secret) throw new Error("PROVIDER_ENCRYPTION_KEY is not configured");
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function encryptSecret(plaintext: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(plaintext));
  return [PREFIX, toBase64(iv), toBase64(new Uint8Array(cipher))].join(".");
}

export async function decryptSecret(payload: string): Promise<string> {
  const [version, ivPart, dataPart] = payload.split(".");
  if (version !== PREFIX || !ivPart || !dataPart) {
    throw new Error("Stored API key is malformed and must be re-entered");
  }
  const key = await getKey();
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(ivPart) },
    key,
    fromBase64(dataPart),
  );
  return decoder.decode(plain);
}

/** Never log a full key; used for admin UI hints only. */
export function maskSecret(value: string): string {
  if (value.length <= 8) return "••••";
  return `${value.slice(0, 4)}••••${value.slice(-4)}`;
}
