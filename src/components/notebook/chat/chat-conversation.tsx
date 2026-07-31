"use client";

import type { ChatStatus } from "ai";
import { memo } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { ChatEmptyState } from "@/components/notebook/chat/chat-empty-state";
import { ChatGeneratingIndicator } from "@/components/notebook/chat/chat-generating-indicator";
import { ChatMessageList } from "@/components/notebook/chat/chat-message-list";
import type { NotebookChatUIMessage } from "@/types";

export const ChatConversation = memo(function ChatConversation({
  messages,
  chatStatus,
  notebookId,
}: {
  messages: NotebookChatUIMessage[];
  chatStatus: ChatStatus;
  notebookId: string;
}) {
  return (
    <Conversation className="flex-1 bg-transparent! scrollbar-thin scroll-fade">
      <ConversationContent className="conversation-content mx-auto max-w-4xl p-5">
        {messages.length === 0 && <ChatEmptyState />}

        <ChatMessageList
          messages={messages}
          chatStatus={chatStatus}
          notebookId={notebookId}
        />

        {chatStatus === "submitted" ? <ChatGeneratingIndicator /> : null}
      </ConversationContent>
      <ConversationScrollButton className="right-4 bottom-4 bg-primary text-primary-foreground" />
    </Conversation>
  );
});
