import { createOpenAI } from "@ai-sdk/openai";
import {
  EMBEDDING_MODEL_ID,
  IMAGE_MODEL_ID,
  TRANSCRIPTION_MODEL_ID,
  TTS_MODEL_ID,
} from "@/lib/constants";
import { getOpenRouterApiKey } from "@/lib/ai/openrouter-config";

export { getChatModel } from "@/lib/ai/chat-model";

let provider: ReturnType<typeof createOpenAI> | null = null;

function getProvider() {
  provider ??= createOpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: getOpenRouterApiKey(),
  });

  return provider;
}

export function getEmbeddingModel() {
  return getProvider().embedding(EMBEDDING_MODEL_ID);
}

export function getTranscriptionModel() {
  return getProvider().transcription(TRANSCRIPTION_MODEL_ID);
}

export function getImageModel() {
  return getProvider().image(IMAGE_MODEL_ID);
}

export function getSpeechModel() {
  return getProvider().speech(TTS_MODEL_ID);
}
