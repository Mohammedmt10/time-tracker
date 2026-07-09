/**
 * Upstash Redis-backed rate limiter for Next.js API routes.
 *
 * Uses sliding window algorithm to enforce per-IP request limits.
 * Works correctly across all serverless containers (unlike in-memory Maps).
 *
 * Tiers:
 *  - authLimiter:    30 requests / 60s  → /api/auth/* endpoints
 *  - generalLimiter: 120 requests / 60s → all other /api/* endpoints
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Single shared Redis client instance
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

/** Strict limiter for authentication endpoints (login, register) */
const authLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "60 s"),
  prefix: "rl:auth",
  analytics: true,
});

/** General limiter for all other API endpoints */
const generalLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(120, "60 s"),
  prefix: "rl:general",
  analytics: true,
});

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp (seconds)
}

/**
 * Checks the rate limit for a given IP and API path.
 * Automatically selects the auth or general limiter based on the path.
 * Fails open (allows the request) if Redis is unavailable or misconfigured.
 */
export async function checkUpstashLimit(
  ip: string,
  path: string
): Promise<RateLimitResult> {
  const isAuth =
    path.startsWith("/api/auth/login") ||
    path.startsWith("/api/auth/register");

  const limiter = isAuth ? authLimiter : generalLimiter;
  const key = `${ip}`;

  try {
    const { success, limit, remaining, reset } = await limiter.limit(key);

    return {
      success,
      limit,
      remaining,
      // Upstash returns reset as a millisecond timestamp; convert to seconds
      reset: Math.ceil(reset / 1000),
    };
  } catch (err) {
    // Fail open: if Redis is down or credentials are invalid, allow the request
    // through rather than blocking all traffic. Log the error for debugging.
    console.error("[upstash-limiter] Rate limit check failed, failing open:", err);
    return { success: true, limit: 0, remaining: 0, reset: 0 };
  }
}
