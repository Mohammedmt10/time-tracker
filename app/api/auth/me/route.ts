/**
 * GET /api/auth/me
 *
 * Returns the currently authenticated user's profile.
 * Requires a valid JWT in the Authorization: Bearer <token> header.
 */

import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, unauthorizedResponse, AuthError } from "@/lib/middleware-auth";

export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth(request);

    const user = await prisma.user.findUnique({
      where: { id: authUser.userId },
      select: { id: true, email: true, name: true, createdAt: true },
    });

    if (!user) {
      return Response.json({ error: "User not found." }, { status: 404 });
    }

    return Response.json({ user });
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponse(error.message);
    }
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}
