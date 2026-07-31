"use client";

import type { FileUIPart } from "ai";
import type React from "react";
import {
  Attachment,
  AttachmentPreview,
} from "@/components/ai-elements/attachments";
import {
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import type { NotebookChatUIMessage } from "@/types";

export function ChatUserMessage({
  message,
}: {
  message: NotebookChatUIMessage;
}) {
  const rendered: React.ReactNode[] = [];
  let gallery: FileUIPart[] = [];

  const flushGallery = (key: string) => {
    if (gallery.length === 0) return;

    rendered.push(
      <div key={key} className="flex max-w-[85%] flex-wrap justify-end gap-2">
        {gallery.map((part) => (
          <Attachment
            key={`${part.type}-${part.url}`}
            data={{ ...part, id: part.url }}
            className="aspect-square h-20"
          >
            <AttachmentPreview className="rounded-2xl bg-accent *:text-primary!" />
          </Attachment>
        ))}
      </div>,
    );
    gallery = [];
  };

  message.parts?.forEach((part, index) => {
    if (part.type === "file") {
      gallery.push(part);
      return;
    }

    flushGallery(`gallery-${index}`);

    if (part.type === "text") {
      rendered.push(
        <MessageContent
          key={`text-${index}-${part.text.slice(0, 12)}`}
          className="max-w-[85%] rounded-xl bg-secondary text-white! ring-3 ring-muted/50"
        >
          <MessageResponse className="border-0 bg-transparent p-0 text-inherit leading-relaxed!">
            {part.text}
          </MessageResponse>
        </MessageContent>,
      );
    }
  });

  flushGallery("gallery-end");

  return (
    <div className="flex w-full animate-in flex-col items-end gap-3 p-2 duration-300 fade-in slide-in-from-right-2">
      {rendered}
    </div>
  );
}
