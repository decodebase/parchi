/**
 * QR token utilities for Parchi ticket validation.
 * Tokens are HMAC-SHA256 signed, generated once at purchase, validated server-side only.
 *
 * Token format: base64url( JSON({ ticketId, eventId, userId, issuedAt }) ) + "." + hmac_signature
 */

const HMAC_ALGO = { name: "HMAC", hash: "SHA-256" };

// ─── Key helpers ──────────────────────────────────────────────

async function importKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const encoded = enc.encode(secret);
  const keyMaterial = new Uint8Array(encoded);
  return crypto.subtle.importKey("raw", keyMaterial, HMAC_ALGO, false, [
    "sign",
    "verify",
  ]);
}

// ─── Encoding helpers ─────────────────────────────────────────

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

// ─── Payload type ─────────────────────────────────────────────

export interface QRPayload {
  ticketId: string;
  eventId: string;
  userId: string;
  issuedAt: number; // unix ms
}

// ─── Token generation (server-side only) ──────────────────────

/**
 * Generate a signed QR token for a ticket.
 * Called once during purchase flow, stored in DB.
 *
 * @param payload  ticket info to embed
 * @param secret   SUPABASE_SERVICE_ROLE_KEY or dedicated QR_SECRET env var
 */
export async function generateQRToken(
  payload: QRPayload,
  secret: string
): Promise<string> {
  const encoder = new TextEncoder();
  const payloadJson = JSON.stringify(payload);
  const payloadB64 = base64urlEncode(encoder.encode(payloadJson));

  const key = await importKey(secret);
  const sig = await crypto.subtle.sign(
    HMAC_ALGO,
    key,
    new Uint8Array(encoder.encode(payloadB64))
  );

  return `${payloadB64}.${base64urlEncode(sig)}`;
}

// ─── Token verification (server-side / Edge Function only) ────

export interface VerifyResult {
  valid: boolean;
  payload?: QRPayload;
  error?: string;
}

/**
 * Verify a QR token signature and decode the payload.
 * Does NOT check DB state (used/cancelled) — that's the caller's job.
 */
export async function verifyQRToken(
  token: string,
  secret: string
): Promise<VerifyResult> {
  const parts = token.split(".");
  if (parts.length !== 2) {
    return { valid: false, error: "Malformed token" };
  }

  const [payloadB64, sigB64] = parts;

  try {
    const encoder = new TextEncoder();
    const key = await importKey(secret);
    const sigBytes = base64urlDecode(sigB64);

    const valid = await crypto.subtle.verify(
      HMAC_ALGO,
      key,
      sigBytes,
      new Uint8Array(encoder.encode(payloadB64))
    );

    if (!valid) return { valid: false, error: "Invalid signature" };

    const payloadBytes = base64urlDecode(payloadB64);
    const payloadJson = new TextDecoder().decode(payloadBytes);
    const payload: QRPayload = JSON.parse(payloadJson);

    return { valid: true, payload };
  } catch (err) {
    return { valid: false, error: "Verification failed" };
  }
}

// ─── Client-side: generate QR image data URL ─────────────────

/**
 * Convert a QR token string into a data URL using the qrcode library.
 * Only call on client side — imports dynamically to avoid SSR issues.
 */
export async function tokenToQRDataURL(token: string): Promise<string> {
  // Dynamic import so this is only bundled client-side
  const QRCode = (await import("qrcode")).default;
  return QRCode.toDataURL(token, {
    width: 300,
    margin: 2,
    color: {
      dark: "#000000",  // black modules — standard, scannable by all QR readers
      light: "#FFFFFF", // white background
    },
  });
}
