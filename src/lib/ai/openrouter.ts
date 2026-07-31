import { createOpenAI } from "@ai-sdk/openai";
import {
  CHAT_MODEL_ID,
  EMBEDDING_MODEL_ID,
  IMAGE_MODEL_ID,
  TRANSCRIPTION_MODEL_ID,
  TTS_MODEL_ID,
} from "@/lib/constants";
import { getOpenRouterApiKey } from "@/lib/ai/openrouter-config";

let openrouterProvider: ReturnType<typeof createOpenAI> | null = null;

function getOpenRouterProvider() {
  if (openrouterProvider) {
    return openrouterProvider;
  }

  openrouterProvider = createOpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: getOpenRouterApiKey(),
  });

  return openrouterProvider;
}

export function getChatModel() {
  return getOpenRouterProvider()(CHAT_MODEL_ID);
}

export function getEmbeddingModel() {
  return getOpenRouterProvider().embedding(EMBEDDING_MODEL_ID);
}

export function getTranscriptionModel() {
  return getOpenRouterProvider().transcription(TRANSCRIPTION_MODEL_ID);
}

export function getImageModel() {
  return getOpenRouterProvider().image(IMAGE_MODEL_ID);
}

export function getSpeechModel() {
  return getOpenRouterProvider().speech(TTS_MODEL_ID);
}
