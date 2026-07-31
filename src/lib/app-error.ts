const SYSTEM_ERROR_MARKERS = [
  "getaddrinfo",
  "enotfound",
  "econnrefused",
  "econnreset",
  "etimedout",
  "enetunreach",
  "ehostunreach",
  "syscall",
  "errno",
  "aborterror",
] as const;

export class AppError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

function getErrorText(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error);
  }

  const cause =
    error.cause instanceof Error
      ? error.cause.message
      : error.cause != null
        ? String(error.cause)
        : "";

  return `${error.message} ${cause}`.trim();
}

export function isSystemErrorMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return SYSTEM_ERROR_MARKERS.some((marker) => lower.includes(marker));
}

export function mapHttpStatusToMessage(status: number): string {
  if (status === 404) {
    return "This page was not found. Check the URL and try again.";
  }

  if (status === 403) {
    return "Access to this page was denied.";
  }

  if (status === 401) {
    return "This page requires sign-in and cannot be imported.";
  }

  if (status === 429) {
    return "Too many requests. Please wait a moment and try again.";
  }

  if (status >= 500) {
    return "This website returned an error. Try again later.";
  }

  return `Could not fetch this page (HTTP ${status}).`;
}

export function toUserFacingError(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): AppError {
  if (error instanceof AppError) {
    return error;
  }

  const text = getErrorText(error).toLowerCase();

  if (text.includes("enotfound") || text.includes("getaddrinfo")) {
    return new AppError(
      "This website could not be found. Check the URL and try again.",
    );
  }

  if (text.includes("econnrefused") || text.includes("ehostunreach")) {
    return new AppError(
      "Could not connect to this website. It may be offline or the URL may be wrong.",
    );
  }

  if (
    text.includes("etimedout") ||
    text.includes("timed out") ||
    text.includes("aborterror") ||
    text.includes("timeout")
  ) {
    return new AppError(
      "The request timed out. The website may be slow or unavailable.",
    );
  }

  if (
    text.includes("cert") ||
    text.includes("ssl") ||
    text.includes("tls") ||
    text.includes("unable to verify")
  ) {
    return new AppError(
      "Could not establish a secure connection to this website.",
    );
  }

  if (text.includes("econnreset") || text.includes("enetunreach")) {
    return new AppError("The connection was interrupted. Please try again.");
  }

  if (error instanceof Error && error.message) {
    if (!isSystemErrorMessage(error.message)) {
      return new AppError(error.message);
    }
  }

  return new AppError(fallback, 500);
}

export function resolveApiErrorStatus(message: string): number {
  if (message.startsWith("Unauthorized")) {
    return 401;
  }

  if (message.startsWith("Validation failed")) {
    return 400;
  }

  if (message === "Notebook not found" || message === "Source not found") {
    return 404;
  }

  return 400;
}

export function getErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (isAppError(error)) {
    return error.message;
  }

  if (error instanceof Error && error.message.trim()) {
    const trimmed = error.message.trim();
    if (trimmed.startsWith("{")) {
      try {
        const parsed = JSON.parse(trimmed) as { error?: string; message?: string };
        if (parsed.error?.trim()) return parsed.error.trim();
        if (parsed.message?.trim()) return parsed.message.trim();
      } catch {
        // Not JSON.
      }
    }

    const cause =
      error.cause instanceof Error
        ? error.cause.message
        : typeof error.cause === "string"
          ? error.cause
          : undefined;

    if (cause && !error.message.includes(cause)) {
      return `${error.message}: ${cause}`;
    }

    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return fallback;
}
