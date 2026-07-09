/**
 * POST /api/auth/logout
 *
 * Revokes the active refresh token in the database and clears the HTTP-only
 * refresh token cookie, effectively logging the user out.
 */

import { type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { revokeRefreshToken } from "@/lib/auth";
import { validateCsrfOrigin } from "@/lib/csrf";

export async function POST(request: NextRequest) {
  try {
    // Guard: reject cross-origin requests to prevent CSRF origin spoofing
    const csrfError = validateCsrfOrigin(request);
    if (csrfError) return csrfError;

    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("refresh_token")?.value;

    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    }

    cookieStore.delete("refresh_token");

    return Response.json({ success: true, message: "Logged out successfully." });
  } catch (error) {
    return Response.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
