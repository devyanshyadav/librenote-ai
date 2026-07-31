"use client";

import { useChat } from "@ai-sdk/react";
import type { ChatStatus, FileUIPart } from "ai";
import { DefaultChatTransport } from "ai";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { sliceChatMessagesForRequest } from "@/lib/chat/message-utils";
import { CHAT_MESSAGE_CHAR_LIMIT } from "@/lib/constants";
import { getErrorMessage } from "@/lib/app-error";
import { useCitationSourcesStore } from "@/stores/citation-sources.store";
import { useNotebookChatStore } from "@/stores/notebook-chat.store";
import type { NotebookChatUIMessage } from "@/types";
import { uploadToGallery } from "@/utils/supabase-upload";

function syncPromptSession(
  notebookId: string,
  chatStatus: ChatStatus,
  handleSubmit: (message: PromptInputMessage) => Promise<void>,
  stopGeneration: () => void,
) {
  const store = useNotebookChatStore.getState();

  if (store.notebookId !== notebookId) {
    store.setPromptSession({
      notebookId,
      chatStatus,
      handleSubmit,
      stopGeneration,
      input: "",
    });
    return;
  }

  if (
    store.chatStatus === chatStatus &&
    store.handleSubmit === handleSubmit &&
    store.stopGeneration === stopGeneration
  ) {
    return;
  }

  store.setPromptSession({
    notebookId,
    chatStatus,
    handleSubmit,
    stopGeneration,
  });
}

export function useNotebookChat(
  notebookId: string,
  initialMessages: NotebookChatUIMessage[],
) {
  useState(() => {
    useCitationSourcesStore.getState().syncFromMessages(initialMessages);
  });

  const transport = useMemo(
    () =>
      new DefaultChatTransport<NotebookChatUIMessage>({
        prepareSendMessagesRequest: ({ messages }) => ({
          body: {
            id: notebookId,
            messages: sliceChatMessagesForRequest(messages),
          },
        }),
      }),
    [notebookId],
  );

  const onError = useCallback((error: Error) => {
    console.error("Chat error:", error);
    toast.error(getErrorMessage(error));
  }, []);

  const onFinish = useCallback(
    ({ messages }: { messages: NotebookChatUIMessage[] }) => {
      useCitationSourcesStore.getState().syncFromMessages(messages);
    },
    [],
  );

  const {
    messages,
    status: chatStatus,
    sendMessage,
    stop,
  } = useChat<NotebookChatUIMessage>({
    id: notebookId,
    messages: initialMessages,
    transport,
    onError,
    onFinish,
  });

  const handleSubmit = useCallback(
    async (message: PromptInputMessage) => {
      try {
        const text = message.text?.trim();
        if (!text) return;

        const uploadedAttachments: FileUIPart[] = [];

        if (message.files && message.files.length > 0) {
          const toastId = toast.loading("Processing attachments...");

          try {
            for (const filePart of message.files) {
              const response = await fetch(filePart.url);
              const blob = await response.blob();
              const file = new File([blob], filePart.filename || "file", {
                type: filePart.mediaType,
              });

              const publicUrl = await uploadToGallery(file);

              uploadedAttachments.push({
                type: "file",
                url: publicUrl,
                filename: file.name,
                mediaType: file.type,
              });
            }

            toast.dismiss(toastId);
          } catch (error) {
            toast.error(
              `Upload failed: ${getErrorMessage(error, "Unknown error")}`,
              { id: toastId },
            );
            return;
          }
        }

        sendMessage({
          metadata: { createdAt: new Date().toISOString() },
          parts: [
            { type: "text", text: text || "Sent with attachments" },
            ...uploadedAttachments,
          ],
        });
        useNotebookChatStore.getState().setInput("");
      } catch (error) {
        console.error("Submission error:", error);
        toast.error(
          getErrorMessage(error, "Failed to send message. Please try again."),
        );
      }
    },
    [sendMessage],
  );

  useEffect(() => {
    syncPromptSession(notebookId, chatStatus, handleSubmit, stop);
  }, [notebookId, chatStatus, handleSubmit, stop]);

  return { messages, chatStatus, notebookId };
}

export function selectIsChatSubmitDisabled(
  input: string,
  chatStatus: ChatStatus,
) {
  if (chatStatus === "streaming" || chatStatus === "submitted") {
    return true;
  }

  return !input.trim() || input.length > CHAT_MESSAGE_CHAR_LIMIT;
}
