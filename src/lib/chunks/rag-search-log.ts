import type { RetrievedChunk } from "@/types";

type RagSearchContext = Record<string, string | number | boolean | undefined>;

function isRagSearchDebugEnabled(): boolean {
  return (
    process.env.RAG_SEARCH_DEBUG === "1" ||
    process.env.NODE_ENV === "development"
  );
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function formatDetails(details?: unknown): string {
  if (details === undefined) {
    return "";
  }

  if (typeof details === "string") {
    return details;
  }

  try {
    return JSON.stringify(details);
  } catch {
    return String(details);
  }
}

export function summarizeRetrievedChunks(chunks: RetrievedChunk[]) {
  return chunks.map((chunk, index) => ({
    rank: index + 1,
    chunkId: chunk.id.slice(0, 8),
    source: chunk.sourceTitle ?? "Document",
    score: Number(chunk.similarity.toFixed(4)),
    preview: chunk.content.slice(0, 72).replace(/\s+/g, " ").trim(),
  }));
}

export class RagSearchLog {
  readonly id: string;
  private readonly startedAt = Date.now();
  private readonly context: RagSearchContext;

  constructor(id: string, context: RagSearchContext = {}) {
    this.id = id;
    this.context = context;
  }

  static create(context: RagSearchContext = {}): RagSearchLog {
    if (!isRagSearchDebugEnabled()) {
      return new RagSearchLog("", context);
    }

    return new RagSearchLog(crypto.randomUUID().slice(0, 8), context);
  }

  start(message: string, details?: unknown): void {
    this.write("start", message, details);
  }

  step(message: string, details?: unknown): void {
    this.write("step", message, details);
  }

  success(message: string, details?: unknown): void {
    this.write("success", message, details);
  }

  fail(message: string, error?: unknown): void {
    this.write("fail", message, formatError(error));
  }

  end(message: string, details?: unknown): void {
    this.write("end", message, {
      durationMs: Date.now() - this.startedAt,
      ...(typeof details === "object" && details !== null
        ? (details as Record<string, unknown>)
        : { details }),
    });
  }

  private write(
    level: "start" | "step" | "success" | "fail" | "end",
    message: string,
    details?: unknown,
  ): void {
    if (!isRagSearchDebugEnabled() || !this.id) {
      return;
    }

    const elapsed = Date.now() - this.startedAt;
    const contextText = Object.entries(this.context)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => `${key}=${value}`)
      .join(" ");

    const label = "[RAG]";
    const detailsText = formatDetails(details);
    const color =
      level === "fail"
        ? "\x1b[31m"
        : level === "success" || level === "end"
          ? "\x1b[32m"
          : level === "start"
            ? "\x1b[36m"
            : "\x1b[34m";
    const reset = "\x1b[0m";
    const dim = "\x1b[2m";
    const line = `${color}${label}${reset} ${message} ${dim}(+${elapsed}ms · #${this.id}${contextText ? ` · ${contextText}` : ""})${reset}`;

    if (level === "fail") {
      console.error(line, detailsText || "");
      return;
    }

    if (level === "success" || level === "end") {
      console.info(line, detailsText || "");
      return;
    }

    console.log(line, detailsText || "");
  }
}
