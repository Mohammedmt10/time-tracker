/**
 * POST /api/auth/login
 *
 * Authenticates a user by email and password. Returns a signed JWT on
 * success. Responds with a generic 401 to avoid leaking whether the email
 * exists (prevents user enumeration attacks).
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
import { verifyRecaptcha } from "@/lib/recaptcha";
import { getClientIp } from "@/lib/get-client-ip";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
  recaptchaToken: z.string().min(1, "reCAPTCHA token is required"),
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

    const { email, password, recaptchaToken } = parsed.data;
    const ip = getClientIp(request);

    // 1. Verify reCAPTCHA token first
    const isCaptchaValid = await verifyRecaptcha(recaptchaToken);
    if (!isCaptchaValid) {
      return Response.json(
        { error: "reCAPTCHA verification failed. Please try again." },
        { status: 400 }
      );
    }

    // 1. Check if the IP or Email is currently locked out
    const { locked, timeLeft, failures } = await checkAuthLockout(ip, email);
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

    const user = await prisma.user.findUnique({ where: { email } });

    // Use a constant-time comparison even when user is not found to avoid
    // timing-based user enumeration.
    const dummyHash = "$2a$12$invalidhashforunknownuserXXXXXXXXXXXXXXXXXXX";
    const passwordMatch = await bcrypt.compare(
      password,
      user?.password ?? dummyHash
    );

    if (!user || !passwordMatch) {
      // 3. Register failed login attempt
      await registerAuthFailure(ip, email);

      return Response.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // 4. Clear failures registry on successful login
    await clearAuthFailures(ip, email);

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
    console.error("LOGIN ERROR:");
    console.error(error);

    return Response.json(
      {
        error: error instanceof Error ? error.message : String(error),
        stack:
          process.env.NODE_ENV === "development" &&
            error instanceof Error
            ? error.stack
            : undefined,
      },
      { status: 500 }
    );
  }
}
