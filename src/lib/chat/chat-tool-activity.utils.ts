import type { ChatStatus } from "ai";
import { extractCitationAnnotationsFromMessage } from "@/lib/chunks/citation-annotations";
import { getChatMessageText } from "@/lib/chat/message-utils";
import type { NotebookChatUIMessage, NotebookSourceListItem } from "@/types";

const MAX_SOURCE_ICONS = 5;
const CHUNK_SOURCE_PATTERN = /source="([^"]+)"/g;

export type SearchContextDisplaySource = {
  id: string;
  title: string;
  type: string;
  metadata: NotebookSourceListItem["metadata"];
};

function parseSourcesFromContext(context: string): string[] {
  return [
    ...new Set(
      [...context.matchAll(CHUNK_SOURCE_PATTERN)]
        .map((match) => match[1]?.trim())
        .filter(Boolean) as string[],
    ),
  ];
}

function getToolOutputContext(output: unknown): string | null {
  if (typeof output === "string") {
    return output;
  }

  if (
    typeof output === "object" &&
    output !== null &&
    "context" in output &&
    typeof output.context === "string"
  ) {
    return output.context;
  }

  return null;
}

function getCitationTitles(message: NotebookChatUIMessage): string[] {
  return [
    ...new Set(
      extractCitationAnnotationsFromMessage(message)
        .filter((annotation) => annotation.type === "citation-sources")
        .flatMap((annotation) =>
          annotation.sources.map((source) => source.title),
        )
        .filter(Boolean),
    ),
  ];
}

function getContextKeysFromToolParts(message: NotebookChatUIMessage): string[] {
  return [
    ...new Set(
      (message.parts ?? [])
        .filter((part) => part.type === "tool-searchContext")
        .flatMap((part) => {
          const context = getToolOutputContext(
            (part as { output?: unknown }).output,
          );
          return context ? parseSourcesFromContext(context) : [];
        }),
    ),
  ];
}

function resolveDisplaySources(
  keys: string[],
  notebookSources: NotebookSourceListItem[],
): SearchContextDisplaySource[] {
  return keys.slice(0, MAX_SOURCE_ICONS).map((key) => {
    const match =
      notebookSources.find((source) => source.title === key) ??
      notebookSources.find(
        (source) =>
          source.metadata &&
          "fileName" in source.metadata &&
          source.metadata.fileName === key,
      );

    return {
      id: match?.id ?? key,
      title: match?.title ?? key,
      type: match?.type ?? "text_note",
      metadata: match?.metadata ?? null,
    };
  });
}

function getReadySourceKeys(readySources: NotebookSourceListItem[]): string[] {
  return readySources.slice(0, MAX_SOURCE_ICONS).map((source) => source.title);
}

export function getSearchContextDisplaySources(
  message: NotebookChatUIMessage | undefined,
  readySources: NotebookSourceListItem[],
): { sources: SearchContextDisplaySource[]; isWaitingForToolOutput: boolean } {
  if (!message) {
    return {
      sources: resolveDisplaySources(
        getReadySourceKeys(readySources),
        readySources,
      ),
      isWaitingForToolOutput: true,
    };
  }

  const matchedKeys = [
    ...new Set([
      ...getCitationTitles(message),
      ...getContextKeysFromToolParts(message),
    ]),
  ];
  const isWaitingForToolOutput = matchedKeys.length === 0;

  return {
    sources: resolveDisplaySources(
      isWaitingForToolOutput ? getReadySourceKeys(readySources) : matchedKeys,
      readySources,
    ),
    isWaitingForToolOutput,
  };
}

export function shouldShowSearchContextIndicator(
  message: NotebookChatUIMessage | undefined,
  chatStatus: ChatStatus,
): boolean {
  if (chatStatus !== "streaming") {
    return false;
  }

  if (!message || message.role === "user") {
    return true;
  }

  if (message.role !== "assistant") {
    return false;
  }

  if (getChatMessageText(message).trim().length > 0) {
    return false;
  }

  return (
    (message.parts ?? []).some((part) => part.type === "tool-searchContext") ||
    getCitationTitles(message).length > 0
  );
}
