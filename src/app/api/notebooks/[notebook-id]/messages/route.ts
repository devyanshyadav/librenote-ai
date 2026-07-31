import type { NextRequest } from "next/server";
import { getNotebookChatMessages } from "@/lib/chat/message-store.service";
import { assertNotebookOwner } from "@/lib/notebooks/notebook.service";
import { getAuthenticatedUserOrThrow } from "@/utils/auth-helpers";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ "notebook-id": string }> },
) {
  try {
    const { "notebook-id": notebookId } = await params;
    const user = await getAuthenticatedUserOrThrow();
    await assertNotebookOwner(notebookId, user.id);

    const messages = await getNotebookChatMessages(notebookId);

    return Response.json({
      success: true,
      data: messages,
      error: null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load chat messages";
    const status = message.startsWith("Unauthorized") ? 401 : 500;

    return Response.json(
      { success: false, data: null, error: message },
      { status },
    );
  }
}
