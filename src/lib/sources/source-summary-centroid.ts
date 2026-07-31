import { SOURCE_EMBEDDING_DIMENSIONS } from "@/lib/constants";

export interface CentroidChunk {
  id: string;
  content: string;
  embedding: number[] | null;
}

export function parseEmbeddingVector(value: unknown): number[] | null {
  if (Array.isArray(value)) {
    if (value.length !== SOURCE_EMBEDDING_DIMENSIONS) {
      return null;
    }

    return value.every((item) => typeof item === "number") ? value : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const normalized = trimmed.startsWith("[")
      ? trimmed
      : `[${trimmed.replace(/^\(|\)$/g, "")}]`;
    const parsed: unknown = JSON.parse(normalized);

    if (
      !Array.isArray(parsed) ||
      parsed.length !== SOURCE_EMBEDDING_DIMENSIONS
    ) {
      return null;
    }

    return parsed.every((item) => typeof item === "number")
      ? (parsed as number[])
      : null;
  } catch {
    return null;
  }
}

export function computeGlobalCentroid(embeddings: number[][]): number[] {
  const dimensions = embeddings[0].length;
  const centroid = Array.from({ length: dimensions }, () => 0);

  for (const embedding of embeddings) {
    for (let index = 0; index < dimensions; index += 1) {
      centroid[index] += embedding[index];
    }
  }

  const count = embeddings.length;
  for (let index = 0; index < dimensions; index += 1) {
    centroid[index] /= count;
  }

  return centroid;
}

export function cosineSimilarity(left: number[], right: number[]): number {
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;

  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftNorm += left[index] * left[index];
    rightNorm += right[index] * right[index];
  }

  const denominator = Math.sqrt(leftNorm) * Math.sqrt(rightNorm);
  return denominator === 0 ? 0 : dot / denominator;
}

export function pickCentroidAnchors(
  batch: CentroidChunk[],
  globalCentroid: number[],
  count: number,
): CentroidChunk[] {
  if (count <= 0 || batch.length === 0) {
    return [];
  }

  const ranked = batch
    .filter((chunk): chunk is CentroidChunk & { embedding: number[] } =>
      Boolean(chunk.embedding),
    )
    .map((chunk) => ({
      chunk,
      score: cosineSimilarity(chunk.embedding, globalCentroid),
    }))
    .sort((left, right) => right.score - left.score);

  return ranked
    .slice(0, Math.min(count, ranked.length))
    .map((item) => item.chunk);
}
