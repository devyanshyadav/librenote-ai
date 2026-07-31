import { transcribe } from "ai";
import { getTranscriptionModel } from "@/lib/ai/openrouter";
import { AppError, toUserFacingError } from "@/lib/app-error";

export async function transcribeAudioFile(file: File): Promise<string> {
  try {
    const { text } = await transcribe({
      model: getTranscriptionModel(),
      audio: Buffer.from(await file.arrayBuffer()),
    });

    const normalized = text.trim();

    if (!normalized) {
      throw new AppError("No speech could be transcribed from the audio file.");
    }

    return normalized;
  } catch (error) {
    throw toUserFacingError(
      error,
      "Could not transcribe this audio file. Please try another file.",
    );
  }
}
