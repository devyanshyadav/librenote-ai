"use client";

import type { ChatStatus } from "ai";
import {
  Message,
  MessageBranch,
  MessageBranchContent,
} from "@/components/ai-elements/message";
import { ChatAssistantMessage } from "@/components/notebook/chat/chat-assistant-message";
import { ChatDateSeparator } from "@/components/notebook/chat/chat-date-separator";
import { ChatSourceSearchIndicator } from "@/components/notebook/chat/chat-source-search-indicator";
import { ChatUserMessage } from "@/components/notebook/chat/chat-user-message";
import {
  formatChatDateSeparator,
  getChatMessageDate,
  shouldShowChatDateSeparator,
} from "@/components/notebook/chat/notebook-chat.utils";
import { shouldShowSearchContextIndicator } from "@/lib/chat/chat-tool-activity.utils";
import type { NotebookChatUIMessage } from "@/types";

export function ChatMessageList({
  messages,
  chatStatus,
  notebookId,
}: {
  messages: NotebookChatUIMessage[];
  chatStatus: ChatStatus;
  notebookId: string;
}) {
  const lastMessage = messages.at(-1);
  const lastMessageId = lastMessage?.id;
  const isStreaming = chatStatus === "streaming" || chatStatus === "submitted";
  const showPendingIndicator =
    lastMessage?.role === "user" &&
    shouldShowSearchContextIndicator(lastMessage, chatStatus);

  return (
    <>
      {messages.map((message, index) => {
        const isActiveTurn = lastMessageId === message.id;

        return (
          <div key={message.id} className="space-y-4">
            {shouldShowChatDateSeparator(messages, index) ? (
              <ChatDateSeparator
                label={formatChatDateSeparator(getChatMessageDate(message))}
              />
            ) : null}
            <MessageBranch defaultBranch={0}>
              <MessageBranchContent>
                <Message from={message.role}>
                  <div className="max-w-full space-y-4">
                    {message.role === "assistant" ? (
                      <ChatAssistantMessage
                        message={message}
                        notebookId={notebookId}
                        showSearchIndicator={
                          isActiveTurn &&
                          shouldShowSearchContextIndicator(message, chatStatus)
                        }
                        showActions={!isActiveTurn || !isStreaming}
                      />
                    ) : (
                      <ChatUserMessage message={message} />
                    )}
                  </div>
                </Message>
              </MessageBranchContent>
            </MessageBranch>
          </div>
        );
      })}

      {showPendingIndicator ? (
        <Message from="assistant">
          <ChatSourceSearchIndicator notebookId={notebookId} />
        </Message>
      ) : null}
    </>
  );
}
