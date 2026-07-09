/**
 * Trusted-proxy-aware client IP extraction.
 *
 * ## Why this matters (IP Spoofing)
 * Blindly trusting the leftmost IP in `X-Forwarded-For` is a classic spoofing
 * vector: any attacker can prepend an arbitrary IP (`X-Forwarded-For: 1.2.3.4`)
 * to bypass IP-based rate limiting and lockout logic.
 *
 * ## How this is fixed
 * We read TRUSTED_PROXY_COUNT from the environment (default: 1 if behind a
 * reverse proxy, 0 for direct connections). We then take the IP at position
 * `ips.length - TRUSTED_PROXY_COUNT - 1` from the XFF list — that is the
 * rightmost IP that was NOT injected by a trusted proxy, i.e. the real client.
 *
 * ### Environment variable
 * TRUSTED_PROXY_COUNT — integer, how many trusted reverse-proxy hops sit in
 *   front of the application. Set to 0 if the app receives direct connections,
 *   1 if behind one load-balancer / CDN edge (Vercel, Nginx, etc.), etc.
 *   Defaults to 1 (most common deployment scenario).
 *
 * ### Examples
 *   Direct internet:   TRUSTED_PROXY_COUNT=0  → use x-real-ip / socket IP
 *   Behind 1 proxy:    TRUSTED_PROXY_COUNT=1  → use rightmost XFF ip
 *   Behind 2 proxies:  TRUSTED_PROXY_COUNT=2  → use second-from-right XFF ip
 */

import type { NextRequest } from "next/server";

const TRUSTED_PROXY_COUNT = (() => {
  const raw = process.env.TRUSTED_PROXY_COUNT;
  const parsed = raw !== undefined ? parseInt(raw, 10) : NaN;
  // Default to 1 (standard single reverse-proxy setup like Vercel / Nginx)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 1;
})();

/**
 * Returns the real client IP for a Next.js request.
 *
 * Priority:
 *  1. Rightmost non-proxy IP from X-Forwarded-For (when TRUSTED_PROXY_COUNT > 0)
 *  2. X-Real-IP header (set by Nginx / Vercel directly)
 *  3. Socket IP from the request object (local dev)
 *  4. Fallback: "127.0.0.1"
 */
export const getClientIp = (request: NextRequest): string => {
  const xForwardedFor = request.headers.get("x-forwarded-for");

  if (xForwardedFor && TRUSTED_PROXY_COUNT > 0) {
    // XFF is a comma-separated list: client, proxy1, proxy2, ...
    // The last N entries are added by our own trusted proxies.
    // The entry just before them is the real client.
    const ips = xForwardedFor
      .split(",")
      .map((ip) => ip.trim())
      .filter(Boolean);

    if (ips.length > 0) {
      // Index of the real-client IP (may be 0 if there are fewer hops than expected)
      const clientIndex = Math.max(0, ips.length - TRUSTED_PROXY_COUNT - 1);
      const candidate = ips[clientIndex];
      if (candidate) return candidate;
    }
  }

  // No proxy in front (TRUSTED_PROXY_COUNT=0) — trust X-Real-IP
  const xRealIP = request.headers.get("x-real-ip");
  if (xRealIP) return xRealIP.trim();

  // Last resort: socket-level IP (only available in Node runtime, not Edge)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const socketIp = (request as any).ip;
  if (socketIp) return socketIp;

  return "127.0.0.1";
};
