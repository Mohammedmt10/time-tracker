/**
 * Sophisticated Authentication Rate Limiter
 *
 * Implements IP-based and Email-based tracking for failed attempts.
 * Integrates exponential backoff lockouts and tarpitting (progressive response throttling).
 *
 * Runs in-memory, which provides optimal speed and no DB overhead on every query.
 */

interface FailureRecord {
  failures: number;
  lockoutUntil: number;
  lastAttempt: number;
}

const ipRegistry = new Map<string, FailureRecord>();
const emailRegistry = new Map<string, FailureRecord>();

// Configurations
const MAX_FAILURES_BEFORE_LOCKOUT = 3;
const WINDOW_ONE_HOUR = 60 * 60 * 1000; // 1 hour window

/**
 * Calculates the lockout duration based on the number of failures.
 * Exponential backoff:
 * - 3 failures: 1 min
 * - 4 failures: 5 mins
 * - 5 failures: 15 mins
 * - 6+ failures: 1 hour
 */
const getLockoutDuration = (failures: number): number => {
  if (failures === 3) return 1 * 60 * 1000; // 1 min
  if (failures === 4) return 5 * 60 * 1000; // 5 mins
  if (failures === 5) return 15 * 60 * 1000; // 15 mins
  return 60 * 60 * 1000; // 1 hour
};

/**
 * Calculates the throttling delay in milliseconds.
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
 * Checks if the IP or Email is currently locked out.
 * Returns the lockout status, remaining time left (in seconds), and failure count.
 */
export const checkAuthLockout = (
  ip: string,
  email: string
): { locked: boolean; timeLeft: number; failures: number } => {
  const now = Date.now();
  const normalizedEmail = email.toLowerCase().trim();

  const ipRecord = ipRegistry.get(ip);
  const emailRecord = emailRegistry.get(normalizedEmail);

  // Check IP-based lockout
  if (ipRecord && ipRecord.lockoutUntil > now) {
    return {
      locked: true,
      timeLeft: Math.ceil((ipRecord.lockoutUntil - now) / 1000),
      failures: ipRecord.failures,
    };
  }

  // Check Email-based lockout
  if (emailRecord && emailRecord.lockoutUntil > now) {
    return {
      locked: true,
      timeLeft: Math.ceil((emailRecord.lockoutUntil - now) / 1000),
      failures: emailRecord.failures,
    };
  }

  // Determine the highest failure count for throttling delay
  const failures = Math.max(ipRecord?.failures || 0, emailRecord?.failures || 0);

  return { locked: false, timeLeft: 0, failures };
};

/**
 * Registers a failed login or registration attempt.
 * Increments the failure count and updates the lockout status if necessary.
 */
export const registerAuthFailure = (ip: string, email: string): void => {
  const now = Date.now();
  const normalizedEmail = email.toLowerCase().trim();

  const updateRegistry = (registry: Map<string, FailureRecord>, key: string) => {
    const record = registry.get(key);

    if (!record) {
      registry.set(key, { failures: 1, lockoutUntil: 0, lastAttempt: now });
    } else {
      // If the last failure was more than 1 hour ago, reset the count to 1
      if (now - record.lastAttempt > WINDOW_ONE_HOUR) {
        record.failures = 1;
        record.lockoutUntil = 0;
      } else {
        record.failures += 1;
        if (record.failures >= MAX_FAILURES_BEFORE_LOCKOUT) {
          const duration = getLockoutDuration(record.failures);
          record.lockoutUntil = now + duration;
        }
      }
      record.lastAttempt = now;
    }
  };

  updateRegistry(ipRegistry, ip);
  updateRegistry(emailRegistry, normalizedEmail);
};

/**
 * Clears the registry entries for an IP and Email upon successful login.
 */
export const clearAuthFailures = (ip: string, email: string): void => {
  const normalizedEmail = email.toLowerCase().trim();
  ipRegistry.delete(ip);
  emailRegistry.delete(normalizedEmail);
};
