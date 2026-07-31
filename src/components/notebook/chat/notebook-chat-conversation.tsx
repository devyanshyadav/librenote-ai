"use client";

import { ChatConversation } from "@/components/notebook/chat/chat-conversation";
import { useNotebookChat } from "@/hooks/use-notebook-chat";
import type { NotebookChatUIMessage } from "@/types";

export function NotebookChatConversation({
  notebookId,
  initialMessages,
}: {
  notebookId: string;
  initialMessages: NotebookChatUIMessage[];
}) {
  const { messages, chatStatus } = useNotebookChat(notebookId, initialMessages);

  return (
    <ChatConversation
      messages={messages}
      chatStatus={chatStatus}
      notebookId={notebookId}
    />
  );
}
