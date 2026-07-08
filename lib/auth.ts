/**
 * JWT utilities for WorkTime authentication.
 *
 * Uses `jose` (RFC 7519 / RFC 7515 compliant) which works in both Node.js
 * and the Edge runtime. The secret is read exclusively server-side from
 * process.env.JWT_SECRET — it is never passed to the client bundle.
 *
 * SECURITY: This file is guarded by `import "server-only"` so Next.js will
 * throw a build-time error if it is accidentally imported in a Client Component.
 */

import "server-only";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import crypto from "crypto";
import { prisma } from "./prisma";

export interface AuthPayload extends JWTPayload {
  userId: string;
  email: string;
}

const getSecret = (): Uint8Array => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "JWT_SECRET is missing or too short. Set a strong secret (≥32 chars) in .env.local."
    );
  }
  return new TextEncoder().encode(secret);
};

/**
 * Signs a JWT with the user's id and email.
 * Token acts as a short-lived access token and expires in 15 minutes.
 */
export const signJwt = async (payload: Omit<AuthPayload, keyof JWTPayload>): Promise<string> => {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(getSecret());
};

/**
 * Verifies a JWT and returns the decoded payload.
 * Throws if the token is invalid or expired.
 */
export const verifyJwt = async (token: string): Promise<AuthPayload> => {
  const { payload } = await jwtVerify(token, getSecret());
  return payload as AuthPayload;
};

/**
 * Generates a cryptographically secure refresh token, saves it to the database,
 * and returns it. Expires in 7 days.
 */
export const createRefreshToken = async (userId: string): Promise<string> => {
  const token = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

  await prisma.refreshToken.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });

  return token;
};

/**
 * Verifies a refresh token against the database and checks for expiration.
 * Cleans up expired tokens if encountered.
 * Returns the userId if valid, or null if invalid/expired.
 */
export const verifyRefreshToken = async (token: string): Promise<string | null> => {
  const record = await prisma.refreshToken.findUnique({
    where: { token },
  });

  if (!record) {
    return null;
  }

  if (record.expiresAt < new Date()) {
    // Cleanup expired token asynchronously
    prisma.refreshToken.delete({ where: { id: record.id } }).catch(() => {});
    return null;
  }

  return record.userId;
};

/**
 * Revokes a refresh token by deleting it from the database.
 */
export const revokeRefreshToken = async (token: string): Promise<void> => {
  try {
    await prisma.refreshToken.delete({
      where: { token },
    });
  } catch {
    // Ignore if already deleted or doesn't exist
  }
};
