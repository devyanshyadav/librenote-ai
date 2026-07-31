"use client";

import type { FileUIPart } from "ai";
import { Paperclip } from "lucide-react";
import { useCallback } from "react";
import {
  Attachment,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from "@/components/ai-elements/attachments";
import { usePromptInputAttachments } from "@/components/ai-elements/prompt-input";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function AttachmentItem({
  attachment,
  onRemove,
}: {
  attachment: FileUIPart & { id: string };
  onRemove: (id: string) => void;
}) {
  const handleRemove = useCallback(
    () => onRemove(attachment.id),
    [attachment.id, onRemove],
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <Attachment data={attachment} onRemove={handleRemove}>
              <AttachmentPreview className="rounded-full" />
              <AttachmentRemove />
            </Attachment>
          }
        />
        <TooltipContent
          side="top"
          className="max-w-[200px] truncate px-2 py-1 text-nowrap text-xs"
        >
          {attachment.filename}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function ChatPromptAttachments() {
  const attachments = usePromptInputAttachments();

  const handleRemove = useCallback(
    (id: string) => attachments.remove(id),
    [attachments],
  );

  if (attachments.files.length === 0) {
    return null;
  }

  return (
    <Attachments variant="inline" className="p-2">
      {attachments.files.map((attachment) => (
        <AttachmentItem
          key={attachment.id}
          attachment={attachment}
          onRemove={handleRemove}
        />
      ))}
    </Attachments>
  );
}

export function ChatAddAttachmentButton() {
  const { openFileDialog } = usePromptInputAttachments();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              onClick={() => openFileDialog()}
            >
              <Paperclip className="size-5" />
            </Button>
          }
        />
        <TooltipContent side="top" className="px-2 py-1 text-xs">
          Add photos or files
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
