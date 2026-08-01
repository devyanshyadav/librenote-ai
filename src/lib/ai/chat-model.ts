import {
  createOpenRouter,
  type OpenRouterChatSettings,
} from "@openrouter/ai-sdk-provider";
import { createFallback } from "ai-fallback";
import { CHAT_FALLBACK_MODEL_ID, CHAT_MODEL_ID } from "@/lib/constants";
import { getOpenRouterApiKey } from "@/lib/ai/openrouter-config";

const CHAT_SETTINGS = {
  parallelToolCalls: true,
  reasoning: { enabled: false, effort: "high" },
} satisfies OpenRouterChatSettings;

let chatModel: ReturnType<typeof createFallback> | null = null;

export function getChatModel() {
  if (chatModel) {
    return chatModel;
  }

  const openrouter = createOpenRouter({ apiKey: getOpenRouterApiKey() });

  chatModel = createFallback({
    models: [CHAT_MODEL_ID, CHAT_FALLBACK_MODEL_ID].map((id) =>
      openrouter(id, CHAT_SETTINGS),
    ),
    onError: (error, modelId) => {
      console.warn(
        `[AI] Model ${modelId} failed, trying next. ${error.message}`,
      );
    },
  });

  return chatModel;
}
