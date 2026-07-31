import { and, desc, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db } from "@/db";
import { notebooks } from "@/db/schema";
import { createNotebookSchema, updateNotebookSchema } from "@/types";
import { getAuthenticatedUserOrThrow } from "@/utils/auth-helpers";

export async function GET() {
  try {
    const user = await getAuthenticatedUserOrThrow();

    const userNotebooks = await db
      .select({
        id: notebooks.id,
        title: notebooks.title,
        description: notebooks.description,
        createdAt: notebooks.createdAt,
      })
      .from(notebooks)
      .where(eq(notebooks.ownerId, user.id))
      .orderBy(desc(notebooks.createdAt));

    return Response.json({
      success: true,
      data: userNotebooks.map((notebook) => ({
        ...notebook,
        createdAt: notebook.createdAt.toISOString(),
      })),
      error: null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch notebooks";
    const status = message.startsWith("Unauthorized") ? 401 : 500;

    return Response.json(
      { success: false, data: null, error: message },
      { status },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserOrThrow();

    const body = createNotebookSchema.safeParse(
      await request.json().catch(() => ({})),
    );

    if (!body.success) {
      throw new Error(`Validation failed: ${body.error.message}`);
    }

    const [newNotebook] = await db
      .insert(notebooks)
      .values({
        title: body.data.title ?? "Untitled Notebook",
        ownerId: user.id,
      })
      .returning({
        id: notebooks.id,
        title: notebooks.title,
        description: notebooks.description,
        createdAt: notebooks.createdAt,
      });

    return Response.json({
      success: true,
      data: {
        ...newNotebook,
        createdAt: newNotebook.createdAt.toISOString(),
      },
      error: null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create notebook";
    const status = message.startsWith("Unauthorized") ? 401 : 500;

    return Response.json(
      { success: false, data: null, error: message },
      { status },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserOrThrow();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      throw new Error("Notebook ID is required");
    }

    await db
      .delete(notebooks)
      .where(and(eq(notebooks.id, id), eq(notebooks.ownerId, user.id)));

    return Response.json({
      success: true,
      data: { id },
      error: null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete notebook";
    const status = message.startsWith("Unauthorized") ? 401 : 500;

    return Response.json(
      { success: false, data: null, error: message },
      { status },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserOrThrow();
    const body = updateNotebookSchema.safeParse(await request.json());

    if (!body.success) {
      throw new Error(`Validation failed: ${body.error.message}`);
    }

    const { id, title, description } = body.data;

    const [updatedNotebook] = await db
      .update(notebooks)
      .set({
        title,
        description: description?.trim() || null,
        updatedAt: new Date(),
      })
      .where(and(eq(notebooks.id, id), eq(notebooks.ownerId, user.id)))
      .returning({
        id: notebooks.id,
        title: notebooks.title,
        description: notebooks.description,
        createdAt: notebooks.createdAt,
      });

    if (!updatedNotebook) {
      throw new Error("Notebook not found or unauthorized");
    }

    return Response.json({
      success: true,
      data: {
        ...updatedNotebook,
        createdAt: updatedNotebook.createdAt.toISOString(),
      },
      error: null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update notebook";
    const status = message.startsWith("Unauthorized") ? 401 : 500;

    return Response.json(
      { success: false, data: null, error: message },
      { status },
    );
  }
}
