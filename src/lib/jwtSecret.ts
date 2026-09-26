/**
 * The key session tokens are signed with. Shared by lib/auth (Node) and the middleware
 * (edge), so it may only use what both runtimes have.
 *
 * Production fails closed: without JWT_SECRET every sign and verify throws, and nobody
 * can log in, rather than silently falling back to a string that is in the repo — which
 * would let anyone mint a session for any user. Development keeps the fallback so a fresh
 * checkout runs. Resolved on use, not at import, so `next build` doesn't need the secret.
 */
const DEV_FALLBACK = "dev-only-secret";

let cached: Uint8Array | null = null;

export function jwtSecret(): Uint8Array {
  if (cached) return cached;
  const value = process.env.JWT_SECRET;
  if (!value) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET is not set — refusing to sign or verify sessions with a public key");
    }
    return new TextEncoder().encode(DEV_FALLBACK);
  }
  cached = new TextEncoder().encode(value);
  return cached;
}
