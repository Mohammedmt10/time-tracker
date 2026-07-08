/**
 * Request authentication guard for Route Handlers.
 *
 * Reads the `Authorization: Bearer <token>` header from the incoming request,
 * verifies the JWT, and returns the decoded user payload. Throws a structured
 * Response error if the token is missing or invalid.
 *
 * Usage in a Route Handler:
 *   const user = await requireAuth(request);
 *   // user.userId, user.email are now available
 */

import "server-only";
import { type NextRequest } from "next/server";
import { verifyJwt, type AuthPayload } from "./auth";

export class AuthError extends Error {
  readonly status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

/**
 * Extracts and verifies the JWT from the Authorization header.
 * Returns the decoded payload on success.
 * Throws an AuthError on failure — catch it and return a 401 response.
 */
export const requireAuth = async (request: NextRequest): Promise<AuthPayload> => {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    throw new AuthError("Missing or malformed Authorization header.");
  }

  try {
    return await verifyJwt(token);
  } catch {
    throw new AuthError("Invalid or expired token.");
  }
};

/**
 * Convenience helper: returns a 401 JSON response from an AuthError.
 */
export const unauthorizedResponse = (message = "Unauthorized"): Response =>
  Response.json({ error: message }, { status: 401 });
