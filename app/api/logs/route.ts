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
const createLogSchema = z.object({
  description: z.string().min(1, "Description is required").max(500),
  project: z.string().min(1).max(100).optional().default("General"),
  startTime: z.string().datetime({ message: "startTime must be an ISO 8601 datetime string" }),
  endTime: z.string().datetime({ message: "endTime must be an ISO 8601 datetime string" }),
  duration: z.number().int().positive("Duration must be a positive integer (seconds)"),
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


function splitByDay(startTime: Date, endTime: Date, duration: number) {
  const totalMs = endTime.getTime() - startTime.getTime();
  const segments: { startTime: Date; endTime: Date; duration: number }[] = [];

  let segStart = startTime;

  while (segStart < endTime) {
    const dayEnd = new Date(segStart);
    dayEnd.setHours(24, 0, 0, 0);

    const segEnd = dayEnd < endTime ? dayEnd : endTime;
    const share = (segEnd.getTime() - segStart.getTime()) / totalMs;

    segments.push({
      startTime: segStart,
      endTime: segEnd,
      duration: Math.round(duration * share),
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

    const { description, project, startTime, endTime, duration } = parsed.data;

    const segments = splitByDay(
      new Date(startTime),
      new Date(endTime),
      duration
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
    if (error instanceof AuthError) {
      return unauthorizedResponse(error.message);
    }

    return Response.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
