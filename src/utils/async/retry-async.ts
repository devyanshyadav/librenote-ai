interface RetryAsyncOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  onRetry?: (context: {
    attempt: number;
    maxAttempts: number;
    error: unknown;
  }) => void;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function retryAsync<T>(
  operation: () => Promise<T>,
  {
    maxAttempts = 3,
    baseDelayMs = 1_000,
    maxDelayMs = 8_000,
    onRetry,
  }: RetryAsyncOptions = {},
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt === maxAttempts) {
        break;
      }

      onRetry?.({ attempt, maxAttempts, error });

      const delay = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
      await sleep(delay);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Operation failed after retries.");
}
