import { generateSpeech, NoSpeechGeneratedError } from "ai";
import { getSpeechModel } from "@/lib/ai/openrouter";

const DEFAULT_SAMPLE_RATE = 24_000;

function parseSampleRate(mediaType: string): number {
  const match = mediaType.match(/rate=(\d+)/);
  return match ? Number(match[1]) : DEFAULT_SAMPLE_RATE;
}

export async function synthesizeSpeech(
  text: string,
  voice: string,
): Promise<{ pcm: Buffer; sampleRate: number }> {
  const input = text.trim();
  if (!input) {
    throw new Error("Cannot synthesize empty speech input.");
  }

  try {
    const result = await generateSpeech({
      model: getSpeechModel(),
      text: input,
      voice,
      outputFormat: "pcm",
      maxRetries: 2,
    });

    return {
      pcm: Buffer.from(result.audio.uint8Array),
      sampleRate: parseSampleRate(result.audio.mediaType),
    };
  } catch (error) {
    if (NoSpeechGeneratedError.isInstance(error)) {
      throw new Error(`Speech synthesis failed: ${error.message}`, {
        cause: error,
      });
    }

    throw error;
  }
}
