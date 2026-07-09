/**
 * POST /api/auth/refresh
 *
 * Validates the HTTP-only refresh token cookie, performs refresh token rotation,
 * updates the cookie, and returns a new short-lived access token.
 */

import { type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { signJwt, verifyRefreshToken, createRefreshToken, revokeRefreshToken } from "@/lib/auth";
import { validateCsrfOrigin } from "@/lib/csrf";

export async function POST(request: NextRequest) {
  try {
    // Guard: reject cross-origin requests to prevent CSRF origin spoofing
    const csrfError = validateCsrfOrigin(request);
    if (csrfError) return csrfError;

    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("refresh_token")?.value;

    if (!refreshToken) {
      return Response.json(
        { error: "No refresh token provided." },
        { status: 401 }
      );
    }

    const userId = await verifyRefreshToken(refreshToken);
    if (!userId) {
      // Clear invalid cookie
      cookieStore.delete("refresh_token");
      return Response.json(
        { error: "Invalid or expired refresh token." },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, createdAt: true },
    });

    if (!user) {
      cookieStore.delete("refresh_token");
      return Response.json(
        { error: "User not found." },
        { status: 404 }
      );
    }

    // Refresh token rotation: revoke the old one and generate a new one
    await revokeRefreshToken(refreshToken);
    const newRefreshToken = await createRefreshToken(user.id);

    cookieStore.set("refresh_token", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    const token = await signJwt({ userId: user.id, email: user.email });

    return Response.json({
      token,
      user,
    });
  } catch (error) {
    return Response.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
