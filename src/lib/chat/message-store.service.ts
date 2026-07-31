import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { notebookChatMessages } from "@/db/schema";
import type { NotebookChatUIMessage } from "@/types";

type StorableChatRole = "user" | "assistant";

function isStorableChatMessage(
  message: NotebookChatUIMessage,
): message is NotebookChatUIMessage & { role: StorableChatRole } {
  return message.role === "user" || message.role === "assistant";
}

function toStoredMessage(
  notebookId: string,
  message: NotebookChatUIMessage,
  createdAt: Date,
) {
  if (!isStorableChatMessage(message) || !message.parts?.length) {
    return null;
  }

  return {
    id: message.id,
    notebookId,
    role: message.role,
    parts: message.parts,
    metadata: message.metadata ?? null,
    createdAt,
  };
}

function parseStoredMessage(row: {
  id: string;
  role: "user" | "assistant";
  parts: NotebookChatUIMessage["parts"];
  metadata: NotebookChatUIMessage["metadata"] | null;
  createdAt: Date;
}): NotebookChatUIMessage | null {
  if (!row.parts.length) {
    return null;
  }

  return {
    id: row.id,
    role: row.role,
    parts: row.parts,
    metadata: {
      ...(row.metadata ?? {}),
      createdAt: row.createdAt.toISOString(),
    },
  };
}

export async function getNotebookChatMessages(
  notebookId: string,
): Promise<NotebookChatUIMessage[]> {
  const rows = await db
    .select({
      id: notebookChatMessages.id,
      role: notebookChatMessages.role,
      parts: notebookChatMessages.parts,
      metadata: notebookChatMessages.metadata,
      createdAt: notebookChatMessages.createdAt,
    })
    .from(notebookChatMessages)
    .where(eq(notebookChatMessages.notebookId, notebookId))
    .orderBy(asc(notebookChatMessages.createdAt));

  return rows.flatMap((row) => {
    const message = parseStoredMessage(row);

    return message ? [message] : [];
  });
}

export async function saveUserMessage(
  notebookId: string,
  messages: NotebookChatUIMessage[],
): Promise<void> {
  const userMessage = messages.findLast((message) => message.role === "user");
  if (!userMessage) {
    return;
  }

  const row = toStoredMessage(notebookId, userMessage, new Date());
  if (!row) {
    return;
  }

  await db.insert(notebookChatMessages).values(row);
}

export async function saveAssistantMessage(
  notebookId: string,
  messages: NotebookChatUIMessage[],
): Promise<void> {
  const assistantMessage = messages.findLast(
    (message) => message.role === "assistant",
  );
  if (!assistantMessage) {
    return;
  }

  const row = toStoredMessage(notebookId, assistantMessage, new Date());
  if (!row) {
    return;
  }

  await db.insert(notebookChatMessages).values(row);
}
