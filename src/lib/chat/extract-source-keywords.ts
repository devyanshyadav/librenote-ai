import { extractKeywordDetails, supportedLanguages } from "@ade_oshineye/yaket";
import { CHAT_SOURCE_MAX_KEYWORDS } from "@/lib/constants";

const SUPPORTED_YAKE_LANGUAGES = new Set(supportedLanguages);

const LANGUAGE_ALIASES: Record<string, string> = {
  jp: "ja",
  cn: "zh",
};

function resolveYakeLanguage(
  text: string,
  languageCode?: string | null,
): string {
  if (languageCode?.trim()) {
    const primary = languageCode
      .trim()
      .toLowerCase()
      .replace("_", "-")
      .split("-")[0];
    const resolved = LANGUAGE_ALIASES[primary] ?? primary;

    if (SUPPORTED_YAKE_LANGUAGES.has(resolved)) {
      return resolved;
    }
  }

  const sample = text.slice(0, 2_000);
  let devanagari = 0;
  let hiraganaKatakana = 0;
  let cjk = 0;

  for (const char of sample) {
    const codePoint = char.codePointAt(0);
    if (!codePoint) {
      continue;
    }

    if (codePoint >= 0x0900 && codePoint <= 0x097f) {
      devanagari += 1;
    } else if (
      (codePoint >= 0x3040 && codePoint <= 0x309f) ||
      (codePoint >= 0x30a0 && codePoint <= 0x30ff)
    ) {
      hiraganaKatakana += 1;
    } else if (codePoint >= 0x4e00 && codePoint <= 0x9fff) {
      cjk += 1;
    }
  }

  if (devanagari >= 8) {
    return "hi";
  }

  if (hiraganaKatakana >= 8) {
    return "ja";
  }

  if (cjk >= 12) {
    return "zh";
  }

  return "en";
}

function titleWords(title: string): Set<string> {
  return new Set(
    title
      .split(/[\s\p{P}\p{S}]+/u)
      .map((word) => word.trim().toLowerCase())
      .filter((word) => word.length >= 2),
  );
}

export function extractSourceKeywords(
  text: string,
  options?: {
    title?: string;
    languageCode?: string | null;
  },
): string[] {
  const trimmed = text.trim();
  if (!trimmed) {
    return [];
  }

  const skipWords = titleWords(options?.title ?? "");
  const details = extractKeywordDetails(trimmed, {
    language: resolveYakeLanguage(trimmed, options?.languageCode),
    n: 1,
    top: CHAT_SOURCE_MAX_KEYWORDS + 8,
  });

  const keywords: string[] = [];
  const seen = new Set<string>();

  for (const item of details) {
    const keyword = item.keyword.trim();
    const normalized = item.normalizedKeyword.trim().toLowerCase();

    if (!keyword || skipWords.has(normalized) || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    keywords.push(keyword);

    if (keywords.length >= CHAT_SOURCE_MAX_KEYWORDS) {
      break;
    }
  }

  return keywords;
}
