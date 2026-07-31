"use client";

import React, { memo, useMemo } from "react";
import type { NotebookChatUIMessage } from "@/types";
import { MessageResponse } from "@/components/ai-elements/message";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { buildCitationSourceList } from "@/lib/chunks/citation-annotations";
import { useCitationSourcesStore } from "@/stores/citation-sources.store";
import { useCitationStore } from "@/stores/citation.store";

export interface InlineCitationResponseProps {
  rawText: string;
  messageParts?: NotebookChatUIMessage["parts"];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Creates a highly forgiving regex that ignores punctuation and whitespace mismatches.
 * e.g., "Frontend: React" from LLM will flawlessly match "Frontend: React," in the chunk.
 */
const createFlexibleRegex = (text: string) => {
  // 1. Strip leading/trailing non-alphanumeric chars to prevent boundary mismatches
  const cleanText = text.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, "");

  if (!cleanText) {
    // Fallback if the query is purely symbols
    return new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  }

  // 2. Split by any non-alphanumeric character (removes internal punctuation/spaces)
  const words = cleanText.split(/[^a-zA-Z0-9]+/);

  // 3. Rejoin with a pattern that allows ANY whitespace or punctuation between words
  return new RegExp(words.join("[\\s\\W]+"), "i");
};

/**
 * Extracts a targeted quote based on boundaries, safely handling PDF formatting quirks.
 */
const getRelevantExcerpt = (chunkContent: string, citationQuery?: string) => {
  const fallbackExcerpt = chunkContent.slice(0, 150) + "...";

  if (!citationQuery) return fallbackExcerpt;

  const isRange = citationQuery.includes("...");
  const [startText, endText] = isRange
    ? citationQuery.split("...").map((s) => s.trim())
    : [citationQuery.trim(), ""];

  if (!startText) return fallbackExcerpt;

  // 1. Find start match using flexible regex
  const startRegex = createFlexibleRegex(startText);
  const startMatch = chunkContent.match(startRegex);

  if (!startMatch || typeof startMatch.index === "undefined") {
    return fallbackExcerpt; // AI hallucinated the start text completely
  }

  const actualStart = startMatch.index;
  let actualEnd = actualStart + startMatch[0].length;

  // 2. Find end match if provided (searching only after the start phrase)
  if (endText) {
    const endRegex = createFlexibleRegex(endText);

    // Search within a reasonable window (e.g., next 1500 chars) to prevent massive highlights
    // in case the LLM used a common word that repeats at the end of the document.
    const searchWindow = 1500;
    const remainingContent = chunkContent.slice(
      actualEnd,
      actualEnd + searchWindow,
    );
    const endMatch = remainingContent.match(endRegex);

    if (endMatch && typeof endMatch.index !== "undefined") {
      // Extend actualEnd to include the full end match
      actualEnd = actualEnd + endMatch.index + endMatch[0].length;
    }
  }

  const matchedTarget = chunkContent.substring(actualStart, actualEnd);

  // 3. Extract visual context (approx 60 chars before and after).
  const contextBefore = chunkContent.substring(
    Math.max(0, actualStart - 60),
    actualStart,
  );
  const contextAfter = chunkContent.substring(
    actualEnd,
    Math.min(chunkContent.length, actualEnd + 60),
  );

  const prefix = actualStart > 0 ? "..." : "";
  const suffix = actualEnd < chunkContent.length ? "..." : "";

  return `${prefix}${contextBefore}**${matchedTarget}**${contextAfter}${suffix}`.trim();
};

const ExcerptText = ({ text }: { text: string }) => {
  return (
    <>
      {text.split(/(\*\*.*?\*\*)/g).map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong
              key={index}
              className="text-foreground font-semibold bg-primary/30 px-0.5 rounded-sm"
            >
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      })}
    </>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

export const InlineCitationResponse = memo(function InlineCitationResponse({
  rawText,
  messageParts = [],
}: InlineCitationResponseProps) {
  const { openCitation } = useCitationStore();
  const storedSourcesById = useCitationSourcesStore(
    (state) => state.sourcesById,
  );

  const sourceMap = useMemo(
    () => buildCitationSourceList(storedSourcesById, messageParts),
    [storedSourcesById, messageParts],
  );

  // 2. Parse text to extract the [^index|quote] string markers
  const hasCitations = /\[\^[^\]]+\]/.test(rawText);
  const citationRegex = /\[\^([^\]]+)\]/gi;

  if (!hasCitations) {
    return (
      <MessageResponse className="text-inherit leading-relaxed!">
        {rawText}
      </MessageResponse>
    );
  }

  const lines = rawText.split("\n");
  let visibleIndex = 0;

  return (
    <TooltipProvider>
      <div className="space-y-3 size-full text-foreground">
        {lines.map((line: string, lineIdx: number) => {
          const parts = line.split(citationRegex);

          // Skip rendering empty lines
          if (parts.length === 1 && parts[0].trim() === "") return null;

          return (
            <div key={lineIdx} className="leading-relaxed">
              {parts.map((part: string, i: number) => {
                if (i % 2 !== 0) {
                  // part has format "index|start__._.__end" or "index"
                  const [chunkId, ...queryParts] = part.split("|");
                  const citationQuery = queryParts.join("|"); // Rejoin safely

                  const sourceItem = sourceMap.find(
                    (source) =>
                      source.id === chunkId || source.chunkDbId === chunkId,
                  );

                  if (!sourceItem) return null;
                  visibleIndex++;

                  const relevantExcerpt = getRelevantExcerpt(
                    sourceItem.content,
                    citationQuery,
                  );

                  return (
                    <Tooltip key={i}>
                      <TooltipTrigger
                        className={"inline-flex citation-tooltip"}
                      >
                        <button
                          type="button"
                          className="font-medium m-0.5 text-xs scale-90 bg-background border ring-2 ring-muted text-muted-foreground aspect-square w-5 h-5 grid place-items-center rounded-full"
                          onClick={() =>
                            openCitation(
                              sourceItem.chunkDbId,
                              sourceItem.sourceId,
                              sourceItem.title,
                            )
                          }
                        >
                          {visibleIndex}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        className={
                          "flex flex-col p-1 gap-1 border rounded-xl bg-muted *:bg-muted"
                        }
                      >
                        <div className="flex flex-col bg-card! rounded-lg p-3">
                          <p className="font-semibold text-xs text-primary line-clamp-1">
                            {sourceItem.title}
                          </p>
                          <div className="text-[11px] text-muted-foreground leading-snug whitespace-pre-wrap">
                            <ExcerptText text={relevantExcerpt} />
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground italic">
                          Click to view full source
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  );
                }
                return (
                  <div
                    key={i}
                    className="inline leading-relaxed citation-tooltip-container"
                  >
                    <MessageResponse className="text-inherit leading-relaxed!">
                      {part}
                    </MessageResponse>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
});
