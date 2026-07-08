/**
 * POST /api/auth/register
 *
 * Creates a new user account, hashes the password with bcrypt, and returns
 * a signed JWT. Responds with 409 if the email is already registered.
 */

import { type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signJwt } from "@/lib/auth";

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return Response.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    // Hash with cost factor 12 — strong without being unreasonably slow
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { email, password: hashedPassword },
      select: { id: true, email: true, name: true, createdAt: true },
    });

    const token = await signJwt({ userId: user.id, email: user.email });

    return Response.json(
      { token, user },
      { status: 201 }
    );
  } catch (error) {
    return Response.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
