"use client";

import { memo } from "react";
import { toast } from "sonner";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import {
  ChatAddAttachmentButton,
  ChatPromptAttachments,
} from "@/components/notebook/chat/chat-attachments";
import { selectIsChatSubmitDisabled } from "@/hooks/use-notebook-chat";
import {
  CHAT_MESSAGE_CHAR_LIMIT,
  NOTEBOOK_CHAT_MAX_FILE_SIZE,
  NOTEBOOK_CHAT_MAX_FILES,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useNotebookChatStore } from "@/stores/notebook-chat.store";

export const ChatPromptInput = memo(function ChatPromptInput() {
  const input = useNotebookChatStore((state) => state.input);
  const chatStatus = useNotebookChatStore((state) => state.chatStatus);
  const setInput = useNotebookChatStore((state) => state.setInput);
  const handleSubmit = useNotebookChatStore((state) => state.handleSubmit);
  const stopGeneration = useNotebookChatStore((state) => state.stopGeneration);
  const isSubmitDisabled = selectIsChatSubmitDisabled(input, chatStatus);

  return (
    <div className="mx-auto w-full max-w-4xl p-3">
      <PromptInput
        globalDrop
        multiple
        maxFiles={NOTEBOOK_CHAT_MAX_FILES}
        maxFileSize={NOTEBOOK_CHAT_MAX_FILE_SIZE}
        onError={(error) => {
          if (error.code === "max_files") {
            toast.error("Only 3 attachments allowed per message.");
          }
          if (error.code === "max_file_size") {
            toast.error("File exceeds 1MB limit.");
          }
        }}
        onSubmit={async (message) => {
          await handleSubmit({ ...message, text: message.text || input });
        }}
        className="w-full"
      >
        {/* <PromptInputHeader className="border-b p-0!">
            <ChatPromptAttachments />
          </PromptInputHeader> */}
        <PromptInputBody className="flex items-end gap-2 justify-between w-full p-2 gap-0">
          <PromptInputTextarea
            onChange={(event) => setInput(event.target.value)}
            value={input}
            maxLength={CHAT_MESSAGE_CHAR_LIMIT}
            placeholder="Ask your sources..."
          />
          <PromptInputSubmit
            className="size-10 rounded-[14px] ring-4 ring-background"
            disabled={isSubmitDisabled}
            status={chatStatus}
            onStop={stopGeneration}
          />
        </PromptInputBody>
        <PromptInputFooter className="p-0"></PromptInputFooter>
      </PromptInput>
    </div>
  );
});
