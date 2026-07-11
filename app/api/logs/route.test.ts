import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/middleware-auth", () => {
  class AuthError extends Error {
    status: number;
    constructor(message: string, status = 401) {
      super(message);
      this.name = "AuthError";
      this.status = status;
    }
  }
  return {
    AuthError,
    requireAuth: vi.fn(),
    unauthorizedResponse: (message = "Unauthorized") =>
      Response.json({ error: message }, { status: 401 }),
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    timeLog: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { POST } from "./route";
import { prisma } from "@/lib/prisma";
import { requireAuth, AuthError } from "@/lib/middleware-auth";

const mockedRequireAuth = vi.mocked(requireAuth);
const mockedFindFirst = vi.mocked(prisma.timeLog.findFirst);
const mockedCreate = vi.mocked(prisma.timeLog.create);
const mockedUpdate = vi.mocked(prisma.timeLog.update);

const AUTH_USER = { userId: "user_1", email: "test@example.com" };

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/logs", {
    method: "POST",
    headers: {
      authorization: "Bearer test-token",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

// Returns whatever was passed to create/update, dressed up as a persisted row.
function echoAsRow(data: Record<string, unknown>) {
  return {
    id: "log_" + Math.random().toString(36).slice(2),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...data,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedRequireAuth.mockResolvedValue(AUTH_USER);
  mockedFindFirst.mockResolvedValue(null);
  mockedCreate.mockImplementation(({ data }) => Promise.resolve(echoAsRow(data)) as never);
  mockedUpdate.mockImplementation(({ data }) => Promise.resolve(echoAsRow(data)) as never);
});

describe("POST /api/logs", () => {
  it("returns 401 when the caller is unauthenticated", async () => {
    mockedRequireAuth.mockRejectedValue(new AuthError("Missing or malformed Authorization header."));

    const res = await POST(makeRequest({}));

    expect(res.status).toBe(401);
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it("returns 400 on invalid payload", async () => {
    const res = await POST(
      makeRequest({
        description: "",
        startTime: "not-a-date",
        endTime: "2026-07-10T12:00:00.000Z",
        duration: -5,
      })
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Validation failed");
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it("creates a single log for a range within one day", async () => {
    const res = await POST(
      makeRequest({
        description: "Write report",
        project: "Docs",
        startTime: "2026-07-10T10:00:00.000Z",
        endTime: "2026-07-10T12:00:00.000Z",
        duration: 7200,
      })
    );

    expect(res.status).toBe(201);
    expect(mockedCreate).toHaveBeenCalledTimes(1);

    const { logs } = await res.json();
    expect(logs).toHaveLength(1);
    expect(logs[0].startTime).toBe("2026-07-10T10:00:00.000Z");
    expect(logs[0].endTime).toBe("2026-07-10T12:00:00.000Z");
    expect(logs[0].duration).toBe(7200);
  });

  it("splits a range that crosses midnight into two segments on either side of the boundary", async () => {
    const res = await POST(
      makeRequest({
        description: "Overnight shift",
        project: "Ops",
        startTime: "2026-07-10T23:00:00.000Z",
        endTime: "2026-07-11T01:00:00.000Z",
        duration: 7200, // 2 hours total
      })
    );

    expect(res.status).toBe(201);
    expect(mockedCreate).toHaveBeenCalledTimes(2);

    const { logs } = await res.json();
    expect(logs).toHaveLength(2);

    // Segment 1: 23:00 -> midnight (1 hour = half the total duration)
    expect(logs[0].startTime).toBe("2026-07-10T23:00:00.000Z");
    expect(logs[0].endTime).toBe("2026-07-11T00:00:00.000Z");
    expect(logs[0].duration).toBe(3600);

    // Segment 2: midnight -> 01:00 (the other half)
    expect(logs[1].startTime).toBe("2026-07-11T00:00:00.000Z");
    expect(logs[1].endTime).toBe("2026-07-11T01:00:00.000Z");
    expect(logs[1].duration).toBe(3600);

    // Durations must add back up to the original total (no seconds lost/gained).
    const total = logs.reduce((sum: number, log: { duration: number }) => sum + log.duration, 0);
    expect(total).toBe(7200);
  });

  it("splits a multi-day range into one segment per day", async () => {
    const res = await POST(
      makeRequest({
        description: "Long session",
        project: "Ops",
        startTime: "2026-07-10T23:00:00.000Z",
        endTime: "2026-07-13T02:00:00.000Z", // spans 3 midnight boundaries
        duration: 3 * 3600 + 2 * 24 * 3600, // 3h across boundaries + 2 full days
      })
    );

    expect(res.status).toBe(201);
    const { logs } = await res.json();
    expect(logs).toHaveLength(4);

    // Segments must be contiguous (each one picks up exactly where the last
    // left off) and none may cross a midnight boundary.
    for (let i = 0; i < logs.length; i++) {
      const start = new Date(logs[i].startTime);
      const end = new Date(logs[i].endTime);
      const crossesMidnight = end.getTime() > start.getTime() && end.getUTCHours() !== 0 && end.getUTCDate() !== start.getUTCDate();
      expect(crossesMidnight).toBe(false);

      if (i > 0) {
        expect(logs[i].startTime).toBe(logs[i - 1].endTime);
      }
    }

    const total = logs.reduce((sum: number, log: { duration: number }) => sum + log.duration, 0);
    expect(total).toBe(3 * 3600 + 2 * 24 * 3600);
  });

  it("splits at the user's local midnight when a timeZone is provided", async () => {
    const res = await POST(
      makeRequest({
        description: "Late night session",
        project: "Ops",
        startTime: "2026-07-10T16:00:00.000Z",
        endTime: "2026-07-10T20:00:00.000Z",
        duration: 4 * 3600,
        timeZone: "Asia/Dhaka",
      })
    );

    expect(res.status).toBe(201);
    const { logs } = await res.json();
    expect(logs).toHaveLength(2);

    expect(logs[0].startTime).toBe("2026-07-10T16:00:00.000Z");
    expect(logs[0].endTime).toBe("2026-07-10T18:00:00.000Z");
    expect(logs[0].duration).toBe(2 * 3600);

    expect(logs[1].startTime).toBe("2026-07-10T18:00:00.000Z");
    expect(logs[1].endTime).toBe("2026-07-10T20:00:00.000Z");
    expect(logs[1].duration).toBe(2 * 3600);
  });

  it("splits a 35-hour session starting at 11 PM local time into 1h + 24h + 10h segments", async () => {
    const res = await POST(
      makeRequest({
        description: "Marathon",
        project: "Ops",
        startTime: "2026-07-10T17:00:00.000Z",
        endTime: "2026-07-12T04:00:00.000Z",
        duration: 35 * 3600,
        timeZone: "Asia/Dhaka",
      })
    );

    expect(res.status).toBe(201);
    const { logs } = await res.json();
    expect(logs).toHaveLength(3);
    expect(logs.map((log: { duration: number }) => log.duration)).toEqual([
      3600,
      24 * 3600,
      10 * 3600,
    ]);
  });

  it("preserves the exact total duration even when shares do not divide evenly", async () => {
    const res = await POST(
      makeRequest({
        description: "Odd duration",
        project: "Ops",
        startTime: "2026-07-10T23:00:00.000Z",
        endTime: "2026-07-13T00:00:01.000Z",
        duration: 12345,
      })
    );

    expect(res.status).toBe(201);
    const { logs } = await res.json();
    const total = logs.reduce((sum: number, log: { duration: number }) => sum + log.duration, 0);
    expect(total).toBe(12345);
  });

  it("rejects an invalid timeZone", async () => {
    const res = await POST(
      makeRequest({
        description: "Bad zone",
        startTime: "2026-07-10T10:00:00.000Z",
        endTime: "2026-07-10T12:00:00.000Z",
        duration: 7200,
        timeZone: "Not/AZone",
      })
    );

    expect(res.status).toBe(400);
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it("rejects a range whose endTime is not after startTime", async () => {
    const res = await POST(
      makeRequest({
        description: "Inverted range",
        startTime: "2026-07-10T12:00:00.000Z",
        endTime: "2026-07-10T10:00:00.000Z",
        duration: 7200,
      })
    );

    expect(res.status).toBe(400);
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it("merges into an existing log when a segment already exists for the same day", async () => {
    const existing = {
      id: "existing_log",
      userId: AUTH_USER.userId,
      description: "Write report",
      project: "Docs",
      startTime: new Date("2026-07-10T10:00:00.000Z"),
      endTime: new Date("2026-07-10T11:00:00.000Z"),
      duration: 1800,
      createdAt: new Date("2026-07-10T11:00:00.000Z"),
      updatedAt: new Date("2026-07-10T11:00:00.000Z"),
    };
    mockedFindFirst.mockResolvedValueOnce(existing);

    const res = await POST(
      makeRequest({
        description: "Write report",
        project: "Docs",
        startTime: "2026-07-10T10:00:00.000Z",
        endTime: "2026-07-10T11:00:00.000Z",
        duration: 1800,
      })
    );

    expect(res.status).toBe(201);
    expect(mockedUpdate).toHaveBeenCalledTimes(1);
    expect(mockedCreate).not.toHaveBeenCalled();

    const updateArgs = mockedUpdate.mock.calls[0][0];
    expect(updateArgs.where).toEqual({ id: "existing_log" });
    expect(updateArgs.data.duration).toBe(3600); // 1800 existing + 1800 new
  });
});
