/**
 * PUT    /api/logs/[id]  — update a specific time log (owner only)
 * DELETE /api/logs/[id]  — delete a specific time log (owner only)
 */

import { type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, unauthorizedResponse, AuthError } from "@/lib/middleware-auth";

// ---------------------------------------------------------------------------
// Validation schema for updating a log entry
// ---------------------------------------------------------------------------
const updateLogSchema = z.object({
  description: z.string().min(1).max(500).optional(),
  project: z.string().min(1).max(100).optional(),
});

// ---------------------------------------------------------------------------
// PUT /api/logs/[id]
// ---------------------------------------------------------------------------
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth(request);
    const { id } = await params;

    const existing = await prisma.timeLog.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!existing) {
      return Response.json({ error: "Log not found." }, { status: 404 });
    }

    // Ownership check — prevent updating another user's logs
    if (existing.userId !== authUser.userId) {
      return Response.json({ error: "Forbidden." }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateLogSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Only update fields that were actually provided
    const updateData: { description?: string; project?: string } = {};
    if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
    if (parsed.data.project !== undefined) updateData.project = parsed.data.project;

    const log = await prisma.timeLog.update({
      where: { id },
      data: updateData,
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

    return Response.json({ log });
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponse(error.message);
    }
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/logs/[id]
// ---------------------------------------------------------------------------
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth(request);
    const { id } = await params;

    const existing = await prisma.timeLog.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!existing) {
      return Response.json({ error: "Log not found." }, { status: 404 });
    }

    // Ownership check — prevent deleting another user's logs
    if (existing.userId !== authUser.userId) {
      return Response.json({ error: "Forbidden." }, { status: 403 });
    }

    await prisma.timeLog.delete({ where: { id } });

    return Response.json({ message: "Log deleted successfully." });
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponse(error.message);
    }
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}
