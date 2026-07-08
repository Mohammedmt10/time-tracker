/**
 * POST /api/auth/register
 *
 * Creates a new user account, hashes the password with bcrypt, and returns
 * a signed JWT. Responds with 409 if the email is already registered.
 */

import { type NextRequest } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signJwt, createRefreshToken } from "@/lib/auth";
import {
  checkAuthLockout,
  registerAuthFailure,
  clearAuthFailures,
  getThrottleDelay,
} from "@/lib/auth-limiter";

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128),
});

/**
 * Safely extracts client IP address from headers.
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
  return (request as any).ip || "127.0.0.1";
};

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
    const ip = getClientIP(request);

    // 1. Check if the IP or Email is currently locked out
    const { locked, timeLeft, failures } = checkAuthLockout(ip, email);
    if (locked) {
      return Response.json(
        { error: `Too many failed attempts. Please try again in ${timeLeft} seconds.` },
        { status: 429 }
      );
    }

    // 2. Tarpitting: Add progressive response delay on repeated failures
    const delay = getThrottleDelay(failures);
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      // 3. Register failed registration attempt (conflict)
      registerAuthFailure(ip, email);

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

    // 4. Clear failures registry on successful registration
    clearAuthFailures(ip, email);

    const token = await signJwt({ userId: user.id, email: user.email });
    const refreshToken = await createRefreshToken(user.id);

    const cookieStore = await cookies();
    cookieStore.set("refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

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
