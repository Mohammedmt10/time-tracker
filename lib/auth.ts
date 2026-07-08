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
 * Token expires in 7 days.
 */
export const signJwt = async (payload: Omit<AuthPayload, keyof JWTPayload>): Promise<string> => {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
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
