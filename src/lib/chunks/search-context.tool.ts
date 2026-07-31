import { tool, type UIMessageStreamWriter } from "ai";
import { searchDocumentChunks } from "@/lib/chunks/rag-search.service";
import { RagSearchLog } from "@/lib/chunks/rag-search-log";
import type {
  CitationSource,
  CitationSourcesAnnotation,
  NotebookChatUIMessage,
  RetrievedChunk,
  SearchContextToolResult,
} from "@/types";
import { searchContextInputSchema } from "@/types";

const SEARCH_CONTEXT_DESCRIPTION =
  "Search the user's selected sources for passages relevant to the question. Required before answering any document question. " +
  "Pass 1–4 keyword-rich queries; use multiple angles (synonyms, sub-topics, comparisons). " +
  "Retry with a fresh query set if results are thin.";

function toCitationSources(chunks: RetrievedChunk[]): CitationSource[] {
  return chunks.map((chunk, index) => ({
    id: String(index + 1),
    title: chunk.sourceTitle || "Document",
    content: chunk.content,
    sourceId: chunk.sourceId,
    chunkDbId: chunk.id,
  }));
}

function mergeRetrievedChunks(
  existingChunks: RetrievedChunk[],
  newChunks: RetrievedChunk[],
): RetrievedChunk[] {
  const merged = [...existingChunks];

  for (const chunk of newChunks) {
    if (!merged.some((existing) => existing.id === chunk.id)) {
      merged.push(chunk);
    }
  }

  return merged;
}

function formatChunksForModel({
  chunks,
  retrievedChunks,
}: {
  chunks: RetrievedChunk[];
  retrievedChunks: RetrievedChunk[];
}): string {
  return chunks
    .map((chunk) => {
      const index =
        retrievedChunks.findIndex((item) => item.id === chunk.id) + 1;
      const isFigure = chunk.metadata?.kind === "figure";
      const pageAttr =
        isFigure && chunk.metadata?.page
          ? ` page="${chunk.metadata.page}"`
          : "";

      return `<chunk index="${index}" source="${chunk.sourceTitle || "Document"}"${isFigure ? ` kind="figure"${pageAttr}` : ""}>\n${chunk.content}\n</chunk>`;
    })
    .join("\n\n");
}

function buildSearchContextModelOutput(output: SearchContextToolResult) {
  const text = `${output.preamble}\n\n${output.context}`;

  if (output.figureImageUrls.length === 0) {
    return { type: "text" as const, value: text };
  }

  const content = [
    { type: "text" as const, text },
    ...output.figureImageUrls.map((imageUrl) => ({
      type: "file" as const,
      mediaType: "image" as const,
      data: { type: "url" as const, url: new URL(imageUrl) },
    })),
  ];

  return { type: "content" as const, value: content };
}

export function createSearchContextTool({
  sourceIds,
  writer,
}: {
  sourceIds: string[];
  writer: UIMessageStreamWriter<NotebookChatUIMessage>;
}) {
  const retrievedChunks: RetrievedChunk[] = [];

  return tool({
    description: SEARCH_CONTEXT_DESCRIPTION,
    inputSchema: searchContextInputSchema,
    execute: async ({ queries }): Promise<SearchContextToolResult | string> => {
      if (sourceIds.length === 0) {
        return "No document sources are currently available for this notebook.";
      }

      const log = RagSearchLog.create({
        tool: "searchContext",
        queryCount: queries.length,
      });
      log.start("searchContext called", { queries });

      const similarChunks = await searchDocumentChunks({
        queries,
        sourceIds,
        log,
      });

      if (similarChunks.length === 0) {
        log.fail("No passages matched the query set");
        return (
          "No passages matched these queries. Call searchContext again with a different set of " +
          "keyword-rich queries — synonyms, broader/narrower terms, or split sub-topics — before " +
          "telling the user nothing was found."
        );
      }

      const mergedChunks = mergeRetrievedChunks(retrievedChunks, similarChunks);
      retrievedChunks.length = 0;
      retrievedChunks.push(...mergedChunks);

      const annotation: CitationSourcesAnnotation = {
        type: "citation-sources",
        sources: toCitationSources(retrievedChunks),
      };
      writer.write({ type: "data-annotation", data: annotation });

      const queryLabel =
        queries.length === 1 ? "1 query" : `${queries.length} queries`;

      log.success("searchContext returning passages", {
        passages: similarChunks.length,
        queryLabel,
      });

      return {
        preamble: `Retrieved ${similarChunks.length} passage(s) from ${queryLabel}.`,
        context: formatChunksForModel({
          chunks: similarChunks,
          retrievedChunks,
        }),
        figureImageUrls: similarChunks.flatMap((chunk) =>
          chunk.metadata?.kind === "figure" && chunk.metadata.imageUrl
            ? [chunk.metadata.imageUrl]
            : [],
        ),
      };
    },
    toModelOutput: ({ output }) =>
      typeof output === "string"
        ? { type: "text", value: output }
        : buildSearchContextModelOutput(output),
  });
}
