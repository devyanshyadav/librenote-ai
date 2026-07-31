import {
  SOURCE_EMBED_CHUNK_MAX_CHARS,
  SOURCE_EMBED_CHUNK_OVERLAP_CHARS,
} from "@/lib/constants";

/**
 * Splits a long string of text into smaller overlapping chunks for RAG embedding.
 *
 * Strategy:
 * - Splits at sentence boundaries (`. `, `? `, `! `) so each chunk is coherent.
 * - Enforces a hard character cap (MAX_CHARS) to stay well under the embedding API
 *   token limit (Mistral Embed: 8,192 tokens ≈ ~6,000 chars conservatively).
 * - Overlaps the last N characters of the previous chunk into the next, so
 *   context at boundaries is not lost for retrieval.
 *
 * @param text            Raw extracted text.
 * @param maxChunkChars   Target max characters per chunk (default 1,800 ≈ ~450 tokens).
 * @param overlapChars    Characters of overlap between consecutive chunks (default 300).
 */
export interface TextChunkSlice {
  index: number;
  content: string;
}

function normalizeExtractedText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function pushChunk(chunks: string[], value: string): void {
  const trimmed = value.trim();
  if (trimmed.length > 0) {
    chunks.push(trimmed);
  }
}

function buildChunksFromNormalized(
  normalized: string,
  maxChunkChars: number,
  overlapChars: number,
): string[] {
  if (normalized.length <= maxChunkChars) {
    return [normalized];
  }

  const sentenceRe = /(?<=[.?!])\s+/g;
  const sentences = normalized.split(sentenceRe).filter((s) => s.length > 0);

  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if (sentence.length > maxChunkChars) {
      if (current.trim().length > 0) {
        pushChunk(chunks, current);
        current = current.slice(-overlapChars);
      }

      let charPos = 0;
      while (charPos < sentence.length) {
        const slice = sentence.slice(charPos, charPos + maxChunkChars);
        chunks.push(slice);
        charPos += maxChunkChars - overlapChars;
      }

      current = sentence.slice(-overlapChars);
      continue;
    }

    const candidate = current.length > 0 ? `${current} ${sentence}` : sentence;

    if (candidate.length <= maxChunkChars) {
      current = candidate;
    } else {
      pushChunk(chunks, current);
      const overlap = current.slice(-overlapChars);
      current = (overlap.trim().length > 0 ? `${overlap} ` : "") + sentence;
    }
  }

  pushChunk(chunks, current);
  return chunks;
}

export function* iterateTextChunks(
  text: string,
  maxChunkChars = SOURCE_EMBED_CHUNK_MAX_CHARS,
  overlapChars = SOURCE_EMBED_CHUNK_OVERLAP_CHARS,
): Generator<TextChunkSlice> {
  const normalized = normalizeExtractedText(text);
  if (!normalized) {
    return;
  }

  const chunks = buildChunksFromNormalized(
    normalized,
    maxChunkChars,
    overlapChars,
  );

  for (let index = 0; index < chunks.length; index += 1) {
    yield { index, content: chunks[index] };
  }
}

export function countTextChunks(
  text: string,
  maxChunkChars = SOURCE_EMBED_CHUNK_MAX_CHARS,
  overlapChars = SOURCE_EMBED_CHUNK_OVERLAP_CHARS,
): number {
  let count = 0;
  for (const _chunk of iterateTextChunks(text, maxChunkChars, overlapChars)) {
    count += 1;
  }
  return count;
}

export function splitTextIntoChunks(
  text: string,
  maxChunkChars = SOURCE_EMBED_CHUNK_MAX_CHARS,
  overlapChars = SOURCE_EMBED_CHUNK_OVERLAP_CHARS,
): string[] {
  if (!text || text.trim().length === 0) return [];

  const normalized = normalizeExtractedText(text);

  if (normalized.length <= maxChunkChars) return [normalized];

  return buildChunksFromNormalized(normalized, maxChunkChars, overlapChars);
}
