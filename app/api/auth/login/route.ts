/**
 * POST /api/auth/login
 *
 * Authenticates a user by email and password. Returns a signed JWT on
 * success. Responds with a generic 401 to avoid leaking whether the email
 * exists (prevents user enumeration attacks).
 */

import { type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signJwt } from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });

    // Use a constant-time comparison even when user is not found to avoid
    // timing-based user enumeration.
    const dummyHash = "$2a$12$invalidhashforunknownuserXXXXXXXXXXXXXXXXXXX";
    const passwordMatch = await bcrypt.compare(
      password,
      user?.password ?? dummyHash
    );

    if (!user || !passwordMatch) {
      return Response.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const token = await signJwt({ userId: user.id, email: user.email });

    return Response.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    return Response.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
