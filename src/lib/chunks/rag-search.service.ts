import type { RerankingModelV4 } from "@ai-sdk/provider";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { getOpenRouterApiKey } from "@/lib/ai/openrouter-config";
import { embed, rerank } from "ai";
import { and, cosineDistance, desc, eq, gt, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  documentChunks as documentChunksTable,
  sources as sourcesTable,
} from "@/db/schema";
import { getEmbeddingModel } from "@/lib/ai/openrouter";
import {
  RagSearchLog,
  summarizeRetrievedChunks,
} from "@/lib/chunks/rag-search-log";
import {
  RAG_CANDIDATE_LIMIT,
  RAG_MAX_CHUNK_COUNT,
  RAG_MAX_CONTEXT_CHARS,
  RAG_SIMILARITY_THRESHOLD,
  RERANK_MODEL_ID,
} from "@/lib/constants";
import type { RetrievedChunk } from "@/types";
import { sourceChunkMetadataSchema } from "@/types";

const OPENROUTER_RERANK_URL = "https://openrouter.ai/api/v1/rerank";
const RERANK_MIN_CANDIDATES = 5;
const RERANK_TIMEOUT_MS = 15_000;

let rerankingModel: RerankingModelV4 | null = null;

function mapRowToRetrievedChunk(chunk: {
  id: string;
  content: string;
  metadata: unknown;
  sourceId: string;
  sourceTitle: string | null;
  similarity: number;
}): RetrievedChunk {
  const parsedMetadata = sourceChunkMetadataSchema.safeParse(chunk.metadata);

  return {
    id: chunk.id,
    content: chunk.content,
    sourceId: chunk.sourceId,
    sourceTitle: chunk.sourceTitle,
    similarity: chunk.similarity,
    metadata: parsedMetadata.success ? parsedMetadata.data : null,
  };
}

function selectChunksForContext(
  candidates: RetrievedChunk[],
): RetrievedChunk[] {
  if (candidates.length === 0) {
    return [];
  }

  const selected: RetrievedChunk[] = [];
  let charCount = 0;

  for (const chunk of candidates) {
    if (selected.length >= RAG_MAX_CHUNK_COUNT) {
      break;
    }

    const nextCharCount = charCount + chunk.content.length;
    if (selected.length > 0 && nextCharCount > RAG_MAX_CONTEXT_CHARS) {
      break;
    }

    selected.push(chunk);
    charCount = nextCharCount;
  }

  return selected.length > 0 ? selected : [candidates[0]];
}

function normalizeSearchQueries(queries: string[]): string[] {
  return [
    ...new Set(queries.map((query) => query.replaceAll("\n", " ").trim())),
  ].filter(Boolean);
}

function dedupeRetrievedChunks(
  resultSets: RetrievedChunk[][],
): RetrievedChunk[] {
  const byId = new Map<string, RetrievedChunk>();

  for (const chunks of resultSets) {
    for (const chunk of chunks) {
      const existing = byId.get(chunk.id);
      if (!existing || chunk.similarity > existing.similarity) {
        byId.set(chunk.id, chunk);
      }
    }
  }

  return [...byId.values()];
}

function createOpenRouterRerankingModel(
  modelId: string,
  apiKey: string,
): RerankingModelV4 {
  return {
    specificationVersion: "v4",
    provider: "openrouter",
    modelId,
    async doRerank({ documents, query, topN, abortSignal }) {
      const response = await fetch(OPENROUTER_RERANK_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: modelId,
          query,
          documents: documents.values,
          top_n: topN ?? documents.values.length,
        }),
        signal: abortSignal,
      });

      if (!response.ok) {
        throw new Error(
          `OpenRouter rerank failed with status ${response.status}`,
        );
      }

      const data = (await response.json()) as {
        results?: Array<{ index: number; relevance_score: number }>;
      };

      if (!data.results?.length) {
        throw new Error("OpenRouter rerank returned no results");
      }

      return {
        ranking: data.results.map((result) => ({
          index: result.index,
          relevanceScore: result.relevance_score,
        })),
      };
    },
  };
}

function getRerankingModel(): RerankingModelV4 {
  if (rerankingModel) {
    return rerankingModel;
  }

  const apiKey = getOpenRouterApiKey();
  const provider = createOpenRouter({ apiKey });
  if (
    "rerankingModel" in provider &&
    typeof provider.rerankingModel === "function"
  ) {
    rerankingModel = provider.rerankingModel(RERANK_MODEL_ID);
    return rerankingModel;
  }

  rerankingModel = createOpenRouterRerankingModel(RERANK_MODEL_ID, apiKey);
  return rerankingModel;
}

async function rerankChunks(
  query: string,
  chunks: RetrievedChunk[],
  log?: RagSearchLog,
): Promise<RetrievedChunk[]> {
  if (chunks.length < RERANK_MIN_CANDIDATES) {
    log?.step("Rerank skipped", {
      reason: "few candidates",
      candidates: chunks.length,
      minRequired: RERANK_MIN_CANDIDATES,
    });
    return chunks;
  }

  try {
    const { ranking } = await rerank({
      model: getRerankingModel(),
      query,
      documents: chunks.map((chunk) => chunk.content),
      topN: chunks.length,
      maxRetries: 0,
      abortSignal: AbortSignal.timeout(RERANK_TIMEOUT_MS),
    });

    if (!ranking.length) {
      log?.fail("Rerank returned no ranking");
      return chunks;
    }

    log?.success("Rerank finished", {
      model: RERANK_MODEL_ID,
      candidates: chunks.length,
      topScore: ranking[0] ? Number(ranking[0].score.toFixed(4)) : 0,
    });

    return ranking
      .filter(
        (result) =>
          result.originalIndex >= 0 && result.originalIndex < chunks.length,
      )
      .map((result) => ({
        ...chunks[result.originalIndex],
        similarity: result.score,
      }));
  } catch (error) {
    log?.fail("Rerank failed, using vector order", error);
    return chunks;
  }
}

async function fetchChunkCandidates({
  query,
  sourceIds,
}: {
  query: string;
  sourceIds: string[];
}): Promise<RetrievedChunk[]> {
  const { embedding } = await embed({
    model: getEmbeddingModel(),
    value: query,
  });

  const similarity = sql<number>`1 - (${cosineDistance(
    documentChunksTable.embedding,
    embedding,
  )})`;

  const candidates = await db
    .select({
      id: documentChunksTable.id,
      content: documentChunksTable.content,
      metadata: documentChunksTable.metadata,
      sourceId: documentChunksTable.sourceId,
      sourceTitle: sourcesTable.title,
      similarity,
    })
    .from(documentChunksTable)
    .leftJoin(sourcesTable, eq(documentChunksTable.sourceId, sourcesTable.id))
    .where(
      and(
        inArray(documentChunksTable.sourceId, sourceIds),
        gt(similarity, RAG_SIMILARITY_THRESHOLD),
      ),
    )
    .orderBy((table) => desc(table.similarity))
    .limit(RAG_CANDIDATE_LIMIT);

  return candidates.map(mapRowToRetrievedChunk);
}

export async function searchDocumentChunks({
  queries,
  sourceIds,
  log,
}: {
  queries: string[];
  sourceIds: string[];
  log?: RagSearchLog;
}): Promise<RetrievedChunk[]> {
  const searchLog = log ?? RagSearchLog.create();
  const startedAt = Date.now();

  if (sourceIds.length === 0) {
    searchLog.fail("No source IDs available for search");
    return [];
  }

  const normalizedQueries = normalizeSearchQueries(queries);
  if (normalizedQueries.length === 0) {
    searchLog.fail("All search queries were empty after normalization");
    return [];
  }

  searchLog.start("Vector search started", {
    queries: normalizedQueries,
    sourceCount: sourceIds.length,
  });

  const resultSets = await Promise.all(
    normalizedQueries.map((query) =>
      fetchChunkCandidates({ query, sourceIds }),
    ),
  );

  const candidates = dedupeRetrievedChunks(resultSets);
  const rerankedChunks = await rerankChunks(
    normalizedQueries.join(" | "),
    candidates,
    searchLog,
  );
  const selectedChunks = selectChunksForContext(rerankedChunks);

  searchLog.end("Retrieval finished", {
    queries: normalizedQueries.length,
    candidates: candidates.length,
    selected: selectedChunks.length,
    finalChunks: summarizeRetrievedChunks(selectedChunks),
    durationMs: Date.now() - startedAt,
  });

  return selectedChunks;
}
