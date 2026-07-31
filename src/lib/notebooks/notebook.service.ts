import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { notebooks } from "@/db/schema";

export async function assertNotebookOwner(
  notebookId: string,
  userId: string,
): Promise<void> {
  const [notebook] = await db
    .select({ id: notebooks.id })
    .from(notebooks)
    .where(and(eq(notebooks.id, notebookId), eq(notebooks.ownerId, userId)))
    .limit(1);

  if (!notebook) {
    throw new Error("Notebook not found");
  }
}
