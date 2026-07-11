/**
 * GET  /api/logs  — fetch the authenticated user's time logs (newest first)
 * POST /api/logs  — create a new time log for the authenticated user
 */

import { type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, unauthorizedResponse, AuthError } from "@/lib/middleware-auth";

// ---------------------------------------------------------------------------
// Validation schema for creating a log entry
// ---------------------------------------------------------------------------
const isValidTimeZone = (timeZone: string) => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
};

const createLogSchema = z
  .object({
    description: z.string().min(1, "Description is required").max(500),
    project: z.string().min(1).max(100).optional().default("General"),
    startTime: z.string().datetime({ message: "startTime must be an ISO 8601 datetime string" }),
    endTime: z.string().datetime({ message: "endTime must be an ISO 8601 datetime string" }),
    timeZone: z
      .string()
      .optional()
      .default("UTC")
      .refine(isValidTimeZone, { message: "timeZone must be a valid IANA time zone" }),
  })
  .refine((data) => new Date(data.endTime) > new Date(data.startTime), {
    message: "endTime must be after startTime",
    path: ["endTime"],
  });

// ---------------------------------------------------------------------------
// GET /api/logs
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth(request);

    const { searchParams } = request.nextUrl;
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "100"), 500);
    const offset = parseInt(searchParams.get("offset") ?? "0");

    const [logs, total] = await prisma.$transaction([
      prisma.timeLog.findMany({
        where: { userId: authUser.userId },
        orderBy: { startTime: "desc" },
        take: limit,
        skip: offset,
        select: {
          id: true,
          description: true,
          project: true,
          startTime: true,
          endTime: true,
          duration: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.timeLog.count({ where: { userId: authUser.userId } }),
    ]);

    return Response.json({ logs, total, limit, offset });
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponse(error.message);
    }
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST /api/logs
// ---------------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;

function zoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second")
  );

  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

function nextMidnightInZone(date: Date, timeZone: string): Date {
  const offset = zoneOffsetMs(date, timeZone);
  const nextLocalMidnight = Math.floor((date.getTime() + offset) / DAY_MS) * DAY_MS + DAY_MS;

  let result = new Date(nextLocalMidnight - offset);
  const offsetAtResult = zoneOffsetMs(result, timeZone);
  if (offsetAtResult !== offset) {
    result = new Date(nextLocalMidnight - offsetAtResult);
  }

  if (result.getTime() <= date.getTime()) {
    result = new Date(result.getTime() + DAY_MS);
  }

  return result;
}

function splitByDay(startTime: Date, endTime: Date, duration: number, timeZone: string) {
  const totalMs = endTime.getTime() - startTime.getTime();
  const segments: { startTime: Date; endTime: Date; duration: number }[] = [];

  if (totalMs <= 0) {
    return segments;
  }

  let segStart = startTime;
  let allocated = 0;

  while (segStart < endTime) {
    const dayEnd = nextMidnightInZone(segStart, timeZone);
    const segEnd = dayEnd < endTime ? dayEnd : endTime;

    const isLastSegment = segEnd.getTime() === endTime.getTime();
    const share = (segEnd.getTime() - segStart.getTime()) / totalMs;
    const segDuration = isLastSegment
      ? duration - allocated
      : Math.round(duration * share);

    allocated += segDuration;
    segments.push({
      startTime: segStart,
      endTime: segEnd,
      duration: segDuration,
    });

    segStart = segEnd;
  }

  return segments;
}

async function createOrUpdateLog({
  userId,
  description,
  project,
  segment,
}: {
  userId: string;
  description: string;
  project: string;
  segment: {
    startTime: Date;
    endTime: Date;
    duration: number;
  };
}) {
  const existingLog = await prisma.timeLog.findFirst({
    where: {
      userId,
      description,
      project,
      startTime: segment.startTime,
      endTime: segment.endTime,
    },
  });

  if (existingLog) {
    return prisma.timeLog.update({
      where: { id: existingLog.id },
      data: {
        duration: existingLog.duration + segment.duration,
        startTime: segment.startTime,
        endTime: segment.endTime,
      },
      select: {
        id: true,
        description: true,
        project: true,
        startTime: true,
        endTime: true,
        duration: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  return prisma.timeLog.create({
    data: {
      userId,
      description,
      project,
      startTime: segment.startTime,
      endTime: segment.endTime,
      duration: segment.duration,
    },
    select: {
      id: true,
      description: true,
      project: true,
      startTime: true,
      endTime: true,
      duration: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth(request);

    const body = await request.json();
    const parsed = createLogSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        {
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { description, project, startTime, endTime, timeZone } = parsed.data;

    const start = new Date(startTime);
    const end = new Date(endTime);
    const duration = Math.round((end.getTime() - start.getTime()) / 1000);

    const segments = splitByDay(
      start,
      end,
      duration,
      timeZone
    );

    const logs = await Promise.all(
      segments.map((segment) =>
        createOrUpdateLog({
          userId: authUser.userId,
          description: description.trim(),
          project: project.trim(),
          segment,
        })
      )
    );

    return Response.json(
      {
        logs,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/logs error:", error);

    if (error instanceof AuthError) {
      return unauthorizedResponse(error.message);
    }

    return Response.json(
      {
        error: error instanceof Error ? error.message : "Internal server error.",
        details:
          error instanceof Error
            ? {
              name: error.name,
              stack:
                process.env.NODE_ENV === "development"
                  ? error.stack
                  : undefined,
            }
            : undefined,
      },
      { status: 500 }
    );
  }
}
