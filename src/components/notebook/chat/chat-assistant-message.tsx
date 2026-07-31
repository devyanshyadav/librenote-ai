"use client";

import { Icon } from "@iconify/react";
import { toast } from "sonner";
import {
  MessageAction,
  MessageActions,
  MessageContent,
} from "@/components/ai-elements/message";
import { InlineCitationResponse } from "@/components/inline-citation-response";
import { ChatSourceSearchIndicator } from "@/components/notebook/chat/chat-source-search-indicator";
import { ClipboardButton } from "@/components/notebook/chat/clipboard-button";
import { getChatMessageText } from "@/components/notebook/chat/notebook-chat.utils";
import { Button } from "@/components/ui/button";
import { FetchLoader } from "@/components/ui/fetch-loader";
import { useStudioStore } from "@/stores/studio.store";
import { useCreateStudioNote } from "@/tanstack/queries/studio.query";
import type { NotebookChatUIMessage } from "@/types";

export function ChatAssistantMessage({
  message,
  notebookId,
  showSearchIndicator,
  showActions,
}: {
  message: NotebookChatUIMessage;
  notebookId: string;
  showSearchIndicator: boolean;
  showActions: boolean;
}) {
  const createNote = useCreateStudioNote(notebookId);
  const setActiveArtifactId = useStudioStore(
    (state) => state.setActiveArtifactId,
  );

  const messageText = getChatMessageText(message);
  const hasText = messageText.trim().length > 0;

  if (!hasText && !showSearchIndicator) {
    return null;
  }

  const handleSaveToNote = () => {
    createNote.mutate(
      {
        title: `Saved Response (${new Date().toLocaleDateString()})`,
        body: messageText,
      },
      {
        onSuccess: (result) => {
          if (result.data) {
            setActiveArtifactId(result.data.id);
          }
          toast.success("Saved to Studio notes");
        },
        onError: (error) => {
          toast.error(
            error instanceof Error
              ? error.message
              : "Failed to save response to notes.",
          );
        },
      },
    );
  };

  return (
    <>
      {showSearchIndicator ? (
        <ChatSourceSearchIndicator notebookId={notebookId} message={message} />
      ) : null}

      {hasText ? (
        <MessageContent className="max-w-[85%] rounded-xl bg-linear-to-b! from-card! to-muted/70 p-3 px-5 text-sm leading-relaxed">
          <InlineCitationResponse
            rawText={messageText}
            messageParts={message.parts}
          />
        </MessageContent>
      ) : null}

      {hasText && showActions ? (
        <MessageActions className="mt-2 flex items-center">
          <MessageAction tooltip="Copy Message">
            <ClipboardButton
              className="flex items-center text-muted-foreground/80"
              beforeCopy={<Icon icon="mynaui:copy" className="size-4" />}
              afterCopy={
                <Icon
                  icon="mynaui:copy-solid"
                  className="text-primary size-5"
                />
              }
              text={messageText}
            />
          </MessageAction>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleSaveToNote}
            disabled={createNote.isPending}
            className="h-8 gap-1.5 rounded-lg px-2.5 text-muted-foreground/80 hover:text-primary"
          >
            {createNote.isPending ? (
              <FetchLoader size="sm" />
            ) : (
              <Icon icon="proicons:note-add" className="size-4" />
            )}
            Save to note
          </Button>
        </MessageActions>
      ) : null}
    </>
  );
}
