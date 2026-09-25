// Family passcode gate. One shared passcode (FAMILY_PASSCODE) unlocks the
// app; the browser then keeps a long-lived httpOnly cookie so kids never
// have to type it again. Changing the passcode signs everyone out.
//
// Uses Web Crypto only so it runs in the proxy as well as route handlers.

export const SESSION_COOKIE = "lb_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

const SESSION_MESSAGE = "learn-buddy-session-v1";

/** The configured passcode, or null when the gate is switched off. */
export function getFamilyPasscode(): string | null {
  const passcode = process.env.FAMILY_PASSCODE?.trim();
  return passcode ? passcode : null;
}

/** Session token derived from the passcode: HMAC-SHA256, hex encoded. */
export async function sessionTokenFor(passcode: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passcode),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(SESSION_MESSAGE));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time string comparison. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function isValidSession(
  token: string | undefined,
  passcode: string,
): Promise<boolean> {
  if (!token) return false;
  return safeEqual(token, await sessionTokenFor(passcode));
}
