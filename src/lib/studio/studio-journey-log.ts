export type StudioJourneyPhase = "api" | "artifact" | "brief" | "digest";

type StudioJourneyLevel = "start" | "step" | "success" | "fail" | "end";

type StudioJourneyContext = Record<
  string,
  string | number | boolean | undefined
>;

const LEVEL_COLORS: Record<StudioJourneyLevel, string> = {
  start: "\x1b[36m",
  step: "\x1b[34m",
  success: "\x1b[32m",
  fail: "\x1b[31m",
  end: "\x1b[35m",
};

const PHASE_BADGE: Record<StudioJourneyPhase, string> = {
  api: "API",
  artifact: "ARTIFACT",
  brief: "BRIEF",
  digest: "DIGEST",
};

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

function isStudioJourneyDebugEnabled(): boolean {
  return (
    process.env.STUDIO_JOURNEY_DEBUG === "1" ||
    process.env.NODE_ENV === "development"
  );
}

export class StudioJourneyLog {
  readonly id: string;
  private readonly startedAt = Date.now();
  private readonly context: StudioJourneyContext;

  constructor(id: string, context: StudioJourneyContext = {}) {
    this.id = id;
    this.context = context;
  }

  static create(context: StudioJourneyContext = {}): StudioJourneyLog {
    if (!isStudioJourneyDebugEnabled()) {
      return new StudioJourneyLog("", context);
    }

    return new StudioJourneyLog(crypto.randomUUID().slice(0, 8), context);
  }

  static continue(
    id: string,
    context: StudioJourneyContext = {},
  ): StudioJourneyLog {
    return new StudioJourneyLog(id, context);
  }

  branch(context: StudioJourneyContext): StudioJourneyLog {
    return new StudioJourneyLog(this.id, { ...this.context, ...context });
  }

  start(phase: StudioJourneyPhase, message: string, details?: unknown): void {
    this.write("start", phase, message, details);
  }

  step(phase: StudioJourneyPhase, message: string, details?: unknown): void {
    this.write("step", phase, message, details);
  }

  success(phase: StudioJourneyPhase, message: string, details?: unknown): void {
    this.write("success", phase, message, details);
  }

  fail(phase: StudioJourneyPhase, message: string, error?: unknown): void {
    this.write("fail", phase, message, formatError(error));
  }

  end(phase: StudioJourneyPhase, message: string, details?: unknown): void {
    this.write("end", phase, message, {
      durationMs: Date.now() - this.startedAt,
      ...(typeof details === "object" && details !== null
        ? (details as Record<string, unknown>)
        : { details }),
    });
  }

  private write(
    level: StudioJourneyLevel,
    phase: StudioJourneyPhase,
    message: string,
    details?: unknown,
  ): void {
    if (!isStudioJourneyDebugEnabled() || !this.id) {
      return;
    }

    const elapsed = Date.now() - this.startedAt;
    const contextText = Object.entries(this.context)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => `${key}=${value}`)
      .join(" ");

    const label = `[Studio ${PHASE_BADGE[phase]}]`;
    const detailsText = formatDetails(details);
    const color = LEVEL_COLORS[level];
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
