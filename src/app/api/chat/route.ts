import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  smoothStream,
  stepCountIs,
  ToolLoopAgent,
  toUIMessageStream,
} from "ai";
import { getChatModel } from "@/lib/ai/openrouter";
import { getErrorMessage, isAppError } from "@/lib/app-error";
import {
  saveAssistantMessage,
  saveUserMessage,
} from "@/lib/chat/message-store.service";
import {
  getLastUserMessageText,
  sanitizeChatMessagesForModel,
} from "@/lib/chat/message-utils";
import {
  buildNotebookChatInstructions,
  getNotebookSourceCatalog,
} from "@/lib/chat/notebook-source-catalog.service";
import { RagSearchLog } from "@/lib/chunks/rag-search-log";
import { getSelectedNotebookSourceIds } from "@/lib/sources/source.service";
import { createSearchContextTool } from "@/lib/chunks/search-context.tool";
import {
  NOTEBOOK_CHAT_MAX_AGENT_STEPS,
  NOTEBOOK_CHAT_MAX_OUTPUT_TOKENS,
} from "@/lib/constants/chat.constants";
import { assertNotebookOwner } from "@/lib/notebooks/notebook.service";
import { generateUUID } from "@/lib/utils";
import {
  notebookChatRequestIdSchema,
  type NotebookChatRequest,
  type NotebookChatUIMessage,
} from "@/types";
import { getAuthenticatedUserOrThrow } from "@/utils/auth-helpers";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as NotebookChatRequest;
    const parsedId = notebookChatRequestIdSchema.safeParse(body.id);

    if (
      !parsedId.success ||
      !Array.isArray(body.messages) ||
      body.messages.length === 0
    ) {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }

    const notebookId = parsedId.data;
    const { messages } = body;

    const user = await getAuthenticatedUserOrThrow();
    await assertNotebookOwner(notebookId, user.id);

    const lastUserMessageText = getLastUserMessageText(messages);
    const sourceIds =
      lastUserMessageText.length > 0
        ? await getSelectedNotebookSourceIds(notebookId)
        : [];

    RagSearchLog.create({ notebookId, phase: "chat" }).start(
      "User message received",
      {
        preview: lastUserMessageText.slice(0, 120),
        messageCount: messages.length,
        selectedSources: sourceIds.length,
      },
    );

    await saveUserMessage(notebookId, messages);

    const modelMessages = sanitizeChatMessagesForModel(messages);

    const stream = createUIMessageStream<NotebookChatUIMessage>({
      originalMessages: messages,
      onError: getErrorMessage,
      execute: async ({ writer }) => {
        const catalog = await getNotebookSourceCatalog(notebookId, sourceIds);
        const agent = new ToolLoopAgent({
          model: getChatModel(),
          instructions: buildNotebookChatInstructions(catalog),
          maxOutputTokens: NOTEBOOK_CHAT_MAX_OUTPUT_TOKENS,
          stopWhen: stepCountIs(NOTEBOOK_CHAT_MAX_AGENT_STEPS),
          tools: {
            searchContext: createSearchContextTool({ sourceIds, writer }),
          },
        });

        const result = await agent.stream({
          messages: await convertToModelMessages(modelMessages),
          experimental_transform: smoothStream({ chunking: "word" }),
          abortSignal: request.signal,
        });

        result.consumeStream();

        writer.merge(
          toUIMessageStream({
            stream: result.stream,
            sendReasoning: true,
            onError: getErrorMessage,
          }),
        );
      },
      onEnd: async ({ messages: persistedMessages }) => {
        try {
          await saveAssistantMessage(notebookId, persistedMessages);
        } catch (error) {
          console.error("[CHAT API] Failed to persist messages:", error);
        }
      },
      generateId: generateUUID,
    });

    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    console.error("[CHAT API] Unhandled error:", error);

    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (isAppError(error)) {
      return Response.json({ error: error.message }, { status: error.statusCode });
    }

    const message = getErrorMessage(error);

    return Response.json({ error: message }, { status: 500 });
  }
}
