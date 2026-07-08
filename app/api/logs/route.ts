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
export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth(request);

    const body = await request.json();
    const parsed = createLogSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { description, project, startTime, endTime, duration } = parsed.data;

    // Check if the user already has a log entry for this exact task description and project
    const existingLog = await prisma.timeLog.findFirst({
      where: {
        userId: authUser.userId,
        description: description.trim(),
        project: project.trim(),
      },
    });

    if (existingLog) {
      const updatedLog = await prisma.timeLog.update({
        where: { id: existingLog.id },
        data: {
          duration: existingLog.duration + duration,
          startTime: new Date(startTime), // update to latest start time
          endTime: new Date(endTime),     // update to latest end time
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

      return Response.json({ log: updatedLog }, { status: 200 });
    }

    const log = await prisma.timeLog.create({
      data: {
        description: description.trim(),
        project: project.trim(),
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        duration,
        userId: authUser.userId,
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

    return Response.json({ log }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponse(error.message);
    }
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}
