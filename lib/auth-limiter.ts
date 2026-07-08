import { prisma } from "./prisma";

// Configurations
const WINDOW_ONE_HOUR = 60 * 60 * 1000; // 1 hour window

/**
 * Calculates the throttling delay in milliseconds for login failures.
 * Tarpitting (progressive delays for failures before lockout):
 * - 1 failure: 500ms
 * - 2 failures: 1500ms
 * - 3+ failures: 3000ms
 */
export const getThrottleDelay = (failures: number): number => {
  if (failures === 1) return 500;
  if (failures === 2) return 1500;
  if (failures >= 3) return 3000;
  return 0;
};

/**
 * Checks strict registration rate limit per IP.
 * Restricts the number of registration attempts to 3 per hour.
 */
export const checkRegisterRateLimit = async (
  ip: string
): Promise<{ limited: boolean; timeLeft: number }> => {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - WINDOW_ONE_HOUR);

  // Count the registration attempts in the last hour
  const count = await prisma.registrationLimit.count({
    where: {
      ip,
      createdAt: { gte: oneHourAgo },
    },
  });

  const MAX_REGISTRATIONS_PER_HOUR = 3;
  if (count >= MAX_REGISTRATIONS_PER_HOUR) {
    // Find the oldest registration in the last hour to calculate exact time left
    const oldest = await prisma.registrationLimit.findFirst({
      where: {
        ip,
        createdAt: { gte: oneHourAgo },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const oldestTime = oldest ? oldest.createdAt.getTime() : now.getTime();
    const timeLeftMs = WINDOW_ONE_HOUR - (now.getTime() - oldestTime);
    return {
      limited: true,
      timeLeft: Math.max(0, Math.ceil(timeLeftMs / 1000)),
    };
  }

  return { limited: false, timeLeft: 0 };
};

/**
 * Registers a registration attempt for an IP in the database.
 */
export const trackRegisterAttempt = async (ip: string): Promise<void> => {
  await prisma.registrationLimit.create({
    data: { ip },
  });

  // Trigger lazy background pruning of records older than 24 hours
  pruneOldRecords().catch(() => {});
};

/**
 * Checks if the IP or Email is currently locked out.
 * Returns the lockout status, remaining time left (in seconds), and failure count.
 */
export const checkAuthLockout = async (
  ip: string,
  email: string
): Promise<{ locked: boolean; timeLeft: number; failures: number }> => {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - WINDOW_ONE_HOUR);
  const normalizedEmail = email.toLowerCase().trim();

  // Count failures for either IP or Email in the last hour
  const failures = await prisma.authFailure.count({
    where: {
      OR: [
        { ip },
        { email: normalizedEmail },
      ],
      createdAt: { gte: oneHourAgo },
    },
  });

  const MAX_FAILURES_BEFORE_LOCKOUT = 3;
  if (failures >= MAX_FAILURES_BEFORE_LOCKOUT) {
    // Lockout durations: 3 failures = 1m, 4 failures = 5m, 5 failures = 15m, 6+ failures = 1h
    const getLockoutDuration = (failCount: number): number => {
      if (failCount === 3) return 1 * 60 * 1000;
      if (failCount === 4) return 5 * 60 * 1000;
      if (failCount === 5) return 15 * 60 * 1000;
      return 60 * 60 * 1000;
    };

    const duration = getLockoutDuration(failures);

    // Get the latest failure timestamp to check if the lockout period is still active
    const latest = await prisma.authFailure.findFirst({
      where: {
        OR: [
          { ip },
          { email: normalizedEmail },
        ],
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (latest) {
      const elapsed = now.getTime() - latest.createdAt.getTime();
      if (elapsed < duration) {
        const timeLeftMs = duration - elapsed;
        return {
          locked: true,
          timeLeft: Math.max(0, Math.ceil(timeLeftMs / 1000)),
          failures,
        };
      }
    }
  }

  return { locked: false, timeLeft: 0, failures };
};

/**
 * Registers a failed login or registration attempt in the database.
 */
export const registerAuthFailure = async (ip: string, email: string): Promise<void> => {
  const normalizedEmail = email.toLowerCase().trim();

  await prisma.authFailure.create({
    data: { ip, email: normalizedEmail },
  });

  // Trigger lazy background pruning of records older than 24 hours
  pruneOldRecords().catch(() => {});
};

/**
 * Clears the registry entries for an IP and Email upon successful login.
 */
export const clearAuthFailures = async (ip: string, email: string): Promise<void> => {
  const normalizedEmail = email.toLowerCase().trim();

  await prisma.authFailure.deleteMany({
    where: {
      OR: [
        { ip },
        { email: normalizedEmail },
      ],
    },
  });
};

/**
 * Prunes rate limiting records older than 24 hours to prevent DB size bloat.
 */
const pruneOldRecords = async (): Promise<void> => {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  await Promise.all([
    prisma.registrationLimit.deleteMany({
      where: { createdAt: { lt: twentyFourHoursAgo } },
    }),
    prisma.authFailure.deleteMany({
      where: { createdAt: { lt: twentyFourHoursAgo } },
    }),
  ]);
};
