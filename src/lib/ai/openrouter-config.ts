import { AppError } from "@/lib/app-error";

export const OPENROUTER_KEYS_URL = "https://openrouter.ai/keys";

export const OPENROUTER_SETUP_HINT =
  "OpenRouter API key is missing. Add OPENROUTER_API_KEY to .env.local, restart the server, then try again.";

export function isOpenRouterConfigured(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY?.trim());
}

export function assertOpenRouterConfigured(): void {
  if (!isOpenRouterConfigured()) {
    throw new AppError(OPENROUTER_SETUP_HINT, 503);
  }
}

export function getOpenRouterApiKey(): string {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new AppError(OPENROUTER_SETUP_HINT, 503);
  }
  return apiKey;
}
