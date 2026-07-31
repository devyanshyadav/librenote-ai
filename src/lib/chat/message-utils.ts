import { NOTEBOOK_CHAT_REQUEST_MESSAGE_LIMIT } from "@/lib/constants";
import type { NotebookChatUIMessage } from "@/types";

export function getChatMessageText(message: NotebookChatUIMessage): string {
  return (
    message.parts
      ?.filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("\n") ?? ""
  );
}

export function getLastUserMessageText(
  messages: NotebookChatUIMessage[],
): string {
  const lastUserMessage = messages.findLast(
    (message) => message.role === "user",
  );

  if (!lastUserMessage) {
    return "";
  }

  return getChatMessageText(lastUserMessage).trim();
}

export function sliceChatMessagesForRequest(
  messages: NotebookChatUIMessage[],
  limit = NOTEBOOK_CHAT_REQUEST_MESSAGE_LIMIT,
): NotebookChatUIMessage[] {
  const chatMessages = messages.filter(
    (message) => message.role === "user" || message.role === "assistant",
  );

  const window = chatMessages.slice(-limit);
  const lastUserMessage = window.findLast((message) => message.role === "user");

  if (!lastUserMessage) {
    return [];
  }

  return window.filter(
    (message) => message.role === "assistant" || message === lastUserMessage,
  );
}

export function sanitizeChatMessagesForModel(
  messages: NotebookChatUIMessage[],
): NotebookChatUIMessage[] {
  return messages.map((message) => ({
    ...message,
    parts: message.parts?.filter((part) => part.type !== "data-annotation"),
  }));
}
