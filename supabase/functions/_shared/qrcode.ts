/**
 * Shared QR token utilities for Supabase Edge Functions (Deno runtime).
 * Mirror of lib/utils/qrcode.ts — keep in sync.
 */

const HMAC_ALGO = { name: "HMAC", hash: "SHA-256" };

async function importKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const encoded = enc.encode(secret);
  const keyMaterial = new Uint8Array(encoded);
  return crypto.subtle.importKey("raw", keyMaterial, HMAC_ALGO, false, [
    "sign",
    "verify",
  ]);
}

function base64urlEncode(buf: ArrayBuffer | Uint8Array): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64urlDecode(str: string): Uint8Array<ArrayBuffer> {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const bytes = atob(padded);
  const buf = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) buf[i] = bytes.charCodeAt(i);
  return buf;
}

export interface QRPayload {
  ticketId: string;
  eventId: string;
  userId: string;
  issuedAt: number;
}

export async function generateQRToken(payload: QRPayload, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const payloadJson = JSON.stringify(payload);
  const payloadB64 = base64urlEncode(encoder.encode(payloadJson));
  const key = await importKey(secret);
  const sig = await crypto.subtle.sign(HMAC_ALGO, key, new Uint8Array(encoder.encode(payloadB64)));
  return `${payloadB64}.${base64urlEncode(sig)}`;
}

export interface VerifyResult {
  valid: boolean;
  payload?: QRPayload;
  error?: string;
}

export async function verifyQRToken(token: string, secret: string): Promise<VerifyResult> {
  const parts = token.split(".");
  if (parts.length !== 2) return { valid: false, error: "Malformed token" };

  const [payloadB64, sigB64] = parts;
  try {
    const encoder = new TextEncoder();
    const key = await importKey(secret);
    const sigBytes = base64urlDecode(sigB64);
    const valid = await crypto.subtle.verify(HMAC_ALGO, key, sigBytes, new Uint8Array(encoder.encode(payloadB64)));
    if (!valid) return { valid: false, error: "Invalid signature" };

    const payloadBytes = base64urlDecode(payloadB64);
    const payload: QRPayload = JSON.parse(new TextDecoder().decode(payloadBytes));
    return { valid: true, payload };
  } catch {
    return { valid: false, error: "Verification failed" };
  }
}
