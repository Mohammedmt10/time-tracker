import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// In-memory store for rate limiting
// Structure: Key (IP + type) -> { count, resetTime }
interface LimitRecord {
  count: number;
  resetTime: number;
}

const limiter = new Map<string, LimitRecord>();

// Configurations
const WINDOW_MS = 60 * 1000; // 1 minute window
const LIMITS = {
  auth: 10,       // 10 requests per minute for login/register endpoints
  general: 100,   // 100 requests per minute for all other API endpoints
};

/**
 * Extracts the client's real IP address from request headers.
 */
const getClientIP = (request: NextRequest): string => {
  const xForwardedFor = request.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    const ips = xForwardedFor.split(",");
    return ips[0].trim();
  }
  const xRealIP = request.headers.get("x-real-ip");
  if (xRealIP) {
    return xRealIP.trim();
  }
  // Default fallback if running locally or behind standard proxies
  return (request as any).ip || "127.0.0.1";
};

/**
 * Validates rate limit status for a given IP and API path.
 */
const checkRateLimit = (ip: string, path: string) => {
  const now = Date.now();
  // Match login/register routes
  const isAuth = path.startsWith("/api/auth/login") || path.startsWith("/api/auth/register");
  const limit = isAuth ? LIMITS.auth : LIMITS.general;
  
  const key = `${ip}:${isAuth ? "auth" : "gen"}`;
  const record = limiter.get(key);

  if (!record || now > record.resetTime) {
    const newRecord = {
      count: 1,
      resetTime: now + WINDOW_MS,
    };
    limiter.set(key, newRecord);

    // Prune logic to prevent unbounded memory growth in the Map
    if (limiter.size > 2000) {
      for (const [k, v] of limiter.entries()) {
        if (now > v.resetTime) {
          limiter.delete(k);
        }
      }
    }

    return { limit, remaining: limit - 1, reset: Math.ceil(newRecord.resetTime / 1000), limited: false };
  }

  record.count += 1;
  const remaining = Math.max(0, limit - record.count);
  const reset = Math.ceil(record.resetTime / 1000);

  if (record.count > limit) {
    return { limit, remaining, reset, limited: true };
  }

  return { limit, remaining, reset, limited: false };
};

/**
 * Injects standard security headers to protect against common web vulnerabilities.
 */
const addSecurityHeaders = (response: NextResponse): NextResponse => {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-XSS-Protection", "1; mode=block");

  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }
  return response;
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Basic Security Check: Block requests with completely empty/missing User-Agents
  const userAgent = request.headers.get("user-agent") || "";
  if (!userAgent || userAgent.trim() === "") {
    const response = new NextResponse(
      JSON.stringify({ error: "Bad Request: Missing User-Agent header." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
    return addSecurityHeaders(response);
  }

  // Only apply rate limiting to API routes
  if (pathname.startsWith("/api")) {
    const ip = getClientIP(request);
    const { limit, remaining, reset, limited } = checkRateLimit(ip, pathname);

    if (limited) {
      const response = new NextResponse(
        JSON.stringify({
          error: "Too many requests. Please try again in a minute.",
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "X-RateLimit-Limit": limit.toString(),
            "X-RateLimit-Remaining": remaining.toString(),
            "X-RateLimit-Reset": reset.toString(),
          },
        }
      );
      return addSecurityHeaders(response);
    }

    // Process the request normally
    const response = NextResponse.next();

    // Set rate limit headers in the successful response
    response.headers.set("X-RateLimit-Limit", limit.toString());
    response.headers.set("X-RateLimit-Remaining", remaining.toString());
    response.headers.set("X-RateLimit-Reset", reset.toString());

    return addSecurityHeaders(response);
  }

  // For non-API routes (pages, static resources, etc.), just add security headers
  const response = NextResponse.next();
  return addSecurityHeaders(response);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files/images (e.g. .*\\..*$)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*$).*)",
  ],
};
