import {
  DEFAULT_KOKORO_AUDIO_LANGUAGE,
  getKokoroLanguageConfig,
  KOKORO_AUDIO_LANGUAGES,
} from "@/lib/constants/kokoro.constants";
import type {
  AudioLanguage,
  AudioLength,
  AudioPodcastStyle,
  StudioGenerateOptions,
} from "@/types";

export const AUDIO_PODCAST_STYLE_OPTIONS: {
  value: AudioPodcastStyle;
  label: string;
  description: string;
}[] = [
  {
    value: "deep_dive",
    label: "Exploration",
    description:
      "Presenters follow threads through your research and show how ideas link together.",
  },
  {
    value: "brief",
    label: "Essentials",
    description:
      "A tight summary that sticks to the main points and skips the padding.",
  },
  {
    value: "critique",
    label: "Review",
    description:
      "An analytical pass over your material — what holds up, what's missing, and what could be stronger.",
  },
  {
    value: "debate",
    label: "Perspectives",
    description:
      "Two viewpoints compare different readings of your research and challenge each other with evidence.",
  },
];

export const AUDIO_LENGTH_OPTIONS: {
  value: AudioLength;
  label: string;
}[] = [
  { value: "short", label: "Short" },
  { value: "default", label: "Default" },
  { value: "long", label: "Long" },
];

export const AUDIO_LANGUAGE_OPTIONS: {
  value: AudioLanguage;
  label: string;
}[] = KOKORO_AUDIO_LANGUAGES.map((language) => ({
  value: language.value,
  label: language.label,
}));

const PODCAST_STYLE_SYSTEM: Record<AudioPodcastStyle, string> = {
  deep_dive:
    "Style: Exploration — presenters talk through how themes connect across the notebook in a curious, conversational way.",
  brief:
    "Style: Essentials — keep it lean; surface only the clearest takeaways.",
  critique:
    "Style: Review — lead with an analytical walkthrough of strengths, gaps, and concrete improvements.",
  debate:
    "Style: Perspectives — contrast interpretations respectfully and back each side with evidence from the material.",
};

const LENGTH_SYSTEM: Record<AudioLength, string> = {
  short: "Length: Short — target roughly 2–4 minutes of spoken audio.",
  default: "Length: Default — target roughly 5–8 minutes of spoken audio.",
  long: "Length: Long — target roughly 10–15 minutes of spoken audio.",
};

export function buildAudioOverviewInstructionBlock(
  options?: StudioGenerateOptions,
): string {
  const parts: string[] = [];

  if (options?.audioOverviewFormat === "podcast" && options.audioPodcastStyle) {
    parts.push(PODCAST_STYLE_SYSTEM[options.audioPodcastStyle]);
  }

  if (options?.audioLength) {
    parts.push(LENGTH_SYSTEM[options.audioLength]);
  }

  const language = options?.audioLanguage ?? DEFAULT_KOKORO_AUDIO_LANGUAGE;
  if (language !== DEFAULT_KOKORO_AUDIO_LANGUAGE) {
    const { scriptLabel } = getKokoroLanguageConfig(language);
    parts.push(
      `Language: Write and perform the entire script in ${scriptLabel}.`,
    );
  }

  return parts.join("\n");
}
