import type { UIMessage } from "ai";
import { z } from "zod";
import { RAG_MULTI_QUERY_MAX } from "@/lib/constants";
import type { SourceChunkMetadata } from "./source.type";

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: Date;
};

type ChatMessageMetadata = {
  createdAt?: string;
};

const usageEventDataSchema = z.object({
  inputTokens: z.number(),
  inputTokenDetails: z
    .object({
      noCacheTokens: z.number().optional(),
      cacheReadTokens: z.number().optional(),
      cacheWriteTokens: z.number().optional(),
    })
    .optional(),
  outputTokens: z.number().optional(),
  outputTokenDetails: z
    .object({
      textTokens: z.number().optional(),
      reasoningTokens: z.number().optional(),
    })
    .optional(),
  totalTokens: z.number(),
  context: z
    .object({
      outputMax: z.number().optional(),
      combinedMax: z.number().optional(),
      totalMax: z.number().optional(),
      maxOutput: z.number().optional(),
      maxTotal: z.number().optional(),
    })
    .optional(),
  costUSD: z.record(z.string(), z.number()).optional(),
  modelId: z.string(),
});

const citationSourceSchema = z.object({
  id: z.string(),
  chunkDbId: z.string(),
  sourceId: z.string(),
  title: z.string(),
  content: z.string(),
});

export type CitationSource = z.infer<typeof citationSourceSchema>;

const citationSourcesAnnotationSchema = z.object({
  type: z.literal("citation-sources"),
  sources: z.array(citationSourceSchema),
});

export type CitationSourcesAnnotation = z.infer<
  typeof citationSourcesAnnotationSchema
>;

type CustomUIDataTypes = {
  usage: z.infer<typeof usageEventDataSchema>;
  annotation: CitationSourcesAnnotation;
};

export type NotebookChatUIMessage = UIMessage<
  ChatMessageMetadata,
  CustomUIDataTypes
>;

export const notebookChatRequestIdSchema = z.string().uuid();

export type NotebookChatRequest = {
  id: string;
  messages: NotebookChatUIMessage[];
};

export const searchContextInputSchema = z.object({
  queries: z
    .array(z.string().min(1))
    .min(1)
    .max(RAG_MULTI_QUERY_MAX)
    .describe(
      "1–4 keyword-rich search queries for vector similarity. Rewrite the user request with " +
        "concrete terms from ACTIVE SOURCES (titles, keywords). Use multiple queries for " +
        "comparisons, synonyms, broader/narrower angles, or multi-part questions. On retry, " +
        "change the whole set — different keywords, resolved pronouns, or new sub-topics.",
    ),
});

export type RetrievedChunk = {
  id: string;
  content: string;
  sourceId: string;
  sourceTitle: string | null;
  similarity: number;
  metadata: SourceChunkMetadata | null;
};

export type SearchContextToolResult = {
  preamble: string;
  context: string;
  figureImageUrls: string[];
};

export interface ChatSourceCatalogEntry {
  title: string;
  type: string;
  description: string | null;
  keywords: string[];
}

export interface ChatSourceCatalog {
  sources: ChatSourceCatalogEntry[];
}
