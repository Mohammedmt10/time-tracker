/**
 * CSRF Origin / Referer validation utility.
 *
 * ## Why this matters (Origin Spoofing / CSRF)
 * The refresh and logout endpoints use HTTP-only cookies for state. Although
 * `SameSite: Lax` cookies block simple cross-site form POSTs, they are still
 * sent on top-level navigations (e.g., a crafted link that triggers a GET-
 * turned-POST redirect). An explicit Origin check is a defence-in-depth guard.
 *
 * ## What this does
 * Reads the `Origin` header (sent by browsers on all cross-origin requests and
 * most same-origin requests). If it is present and does NOT match the known
 * allowed origins, the request is rejected with 403 before any cookie or token
 * logic executes.
 *
 * Note: requests without an `Origin` header (e.g. direct server-to-server calls
 * or curl) are allowed through so that automated health-checks and legitimate
 * server clients are not broken. True browser-originated CSRF will always carry
 * an `Origin` header.
 */

import type { NextRequest } from "next/server";

/** Build the allow-list once at module load time. */
const buildAllowedOrigins = (): Set<string> => {
  const origins = new Set<string>();

  // Explicit production domain
  origins.add("https://time.tajirsystems.com");

  // Allow CLIENT_URL from env (e.g. staging domain)
  const clientUrl = process.env.CLIENT_URL;
  if (clientUrl) origins.add(clientUrl.replace(/\/$/, ""));

  // Allow localhost variants in development
  if (process.env.NODE_ENV === "development") {
    origins.add("http://localhost:3000");
    origins.add("http://localhost:3001");
  }

  return origins;
};

const ALLOWED_ORIGINS = buildAllowedOrigins();

/**
 * Validates the `Origin` header of a mutating request.
 *
 * @returns `null` if the request passes the check (origin is allowed or absent).
 * @returns A `Response` with status 403 if a foreign origin is detected.
 *
 * Usage in a route handler:
 *   const csrfError = validateCsrfOrigin(request);
 *   if (csrfError) return csrfError;
 */
export const validateCsrfOrigin = (request: NextRequest): Response | null => {
  const origin = request.headers.get("origin");

  // No Origin header → allow (server-to-server or direct fetch without browser)
  if (!origin) return null;

  if (!ALLOWED_ORIGINS.has(origin)) {
    return Response.json(
      { error: "Forbidden: cross-origin request rejected." },
      { status: 403 }
    );
  }

  return null;
};
