import { synthesizeSpeech } from "@/lib/ai/speech";
import {
  DEFAULT_KOKORO_AUDIO_LANGUAGE,
  getKokoroVoice,
  type KokoroAudioLanguage,
  type KokoroScriptSpeaker,
} from "@/lib/constants/kokoro.constants";
import {
  assembleAudio,
  buildTtsRequests,
  pcmToWav,
} from "@/lib/studio/audio-overview.utils";
import { createClient } from "@/lib/supabase/server";
import type { AudioOverviewContent, AudioOverviewPlayback } from "@/types";

const BUCKET = "gallery";

export async function synthesizeAudioOverviewFile(
  content: AudioOverviewContent,
  userId: string,
  artifactId: string,
  language: KokoroAudioLanguage = DEFAULT_KOKORO_AUDIO_LANGUAGE,
): Promise<{ fileUrl: string; playback: AudioOverviewPlayback }> {
  const requests = buildTtsRequests(content);

  if (requests.length === 0) {
    throw new Error("Audio script has no speakable lines.");
  }

  const tracks = await Promise.all(
    requests.map(async (request) => {
      const speech = await synthesizeSpeech(
        request.text,
        getKokoroVoice(language, request.speaker as KokoroScriptSpeaker),
      );

      return {
        speaker: request.speaker,
        lines: request.lines,
        pcm: speech.pcm,
        sampleRate: speech.sampleRate,
      };
    }),
  );

  const { pcm, playback, sampleRate } = assembleAudio(content, tracks);
  const supabase = await createClient();
  const path = `${userId}/studio/${artifactId}/audio-overview.wav`;
  const wav = pcmToWav(pcm, sampleRate);

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, wav, {
      cacheControl: "31536000",
      upsert: true,
      contentType: "audio/wav",
    });

  if (error) {
    throw new Error(`Audio upload failed: ${error.message}`);
  }

  const fileUrl = supabase.storage.from(BUCKET).getPublicUrl(data.path)
    .data.publicUrl;

  return { fileUrl, playback };
}
