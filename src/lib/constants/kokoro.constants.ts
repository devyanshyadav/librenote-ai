/** Kokoro 82M voices — one female + one male per language. @see VOICES.md */
export const KOKORO_AUDIO_LANGUAGES = [
  {
    value: "en-us",
    label: "English (US)",
    scriptLabel: "American English",
    voices: { female: "af_heart", male: "am_fenrir" },
  },
  {
    value: "en-gb",
    label: "English (UK)",
    scriptLabel: "British English",
    voices: { female: "bf_emma", male: "bm_fable" },
  },
  {
    value: "es",
    label: "Spanish",
    scriptLabel: "Spanish",
    voices: { female: "ef_dora", male: "em_alex" },
  },
  {
    value: "fr",
    label: "French",
    scriptLabel: "French",
    voices: { female: "ff_siwis", male: "ff_siwis" },
  },
  {
    value: "hi",
    label: "Hindi",
    scriptLabel: "Hindi",
    voices: { female: "hf_alpha", male: "hm_omega" },
  },
  {
    value: "it",
    label: "Italian",
    scriptLabel: "Italian",
    voices: { female: "if_sara", male: "im_nicola" },
  },
  {
    value: "ja",
    label: "Japanese",
    scriptLabel: "Japanese",
    voices: { female: "jf_alpha", male: "jm_kumo" },
  },
  {
    value: "pt",
    label: "Portuguese (Brazil)",
    scriptLabel: "Brazilian Portuguese",
    voices: { female: "pf_dora", male: "pm_alex" },
  },
  {
    value: "zh",
    label: "Chinese (Mandarin)",
    scriptLabel: "Mandarin Chinese",
    voices: { female: "zf_xiaobei", male: "zm_yunjian" },
  },
] as const;

export const KOKORO_AUDIO_LANGUAGE_CODES = KOKORO_AUDIO_LANGUAGES.map(
  (language) => language.value,
);

export type KokoroAudioLanguage =
  (typeof KOKORO_AUDIO_LANGUAGES)[number]["value"];

export const DEFAULT_KOKORO_AUDIO_LANGUAGE: KokoroAudioLanguage = "en-us";

export type KokoroScriptSpeaker = "narrator" | "host" | "cohost";

const LANGUAGE_BY_CODE = new Map(
  KOKORO_AUDIO_LANGUAGES.map((language) => [language.value, language]),
);

export function getKokoroLanguageConfig(language: KokoroAudioLanguage) {
  return LANGUAGE_BY_CODE.get(language) ?? KOKORO_AUDIO_LANGUAGES[0];
}

export function getKokoroVoice(
  language: KokoroAudioLanguage,
  speaker: KokoroScriptSpeaker,
): string {
  const { voices } = getKokoroLanguageConfig(language);
  return speaker === "host" ? voices.male : voices.female;
}
