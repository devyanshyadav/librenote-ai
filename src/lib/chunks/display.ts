import { SOURCE_EMBED_CHUNK_OVERLAP_CHARS } from "@/lib/constants";
import type { SourceChunk } from "@/types";

function stripLeadingOverlap(previous: string, current: string): string {
  const maxOverlap = Math.min(
    previous.length,
    current.length,
    SOURCE_EMBED_CHUNK_OVERLAP_CHARS,
  );

  for (let size = maxOverlap; size >= 40; size -= 1) {
    const prefix = current.slice(0, size);
    if (previous.endsWith(prefix)) {
      return current.slice(size).trimStart();
    }
  }

  return current;
}

/** Text shown in the source viewer — hides embed overlap from the prior chunk. */
export function getChunkDisplayContent(
  chunks: SourceChunk[],
  index: number,
): string {
  const chunk = chunks[index];

  if (chunk.metadata?.kind === "figure") {
    return chunk.content;
  }

  const previous = chunks[index - 1];
  if (!previous || previous.metadata?.kind === "figure") {
    return chunk.content;
  }

  return stripLeadingOverlap(previous.content, chunk.content);
}
