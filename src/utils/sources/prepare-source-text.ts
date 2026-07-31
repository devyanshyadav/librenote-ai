import { SOURCE_MAX_STORED_TEXT_CHARS } from "@/lib/constants";
import { sanitizeSourceText } from "@/utils/sources/sanitize-source-text";

export interface PreparedSourceText {
  /** Full text used for chunking (always complete) */
  fullText: string;
  /** Text persisted on the source row — null when content lives in chunks only */
  storedText: string | null;
  totalCharacters: number;
  isStoredInChunksOnly: boolean;
}

export function prepareSourceText(rawText: string): PreparedSourceText {
  const fullText = sanitizeSourceText(rawText);

  if (!fullText) {
    return {
      fullText: "",
      storedText: null,
      totalCharacters: 0,
      isStoredInChunksOnly: false,
    };
  }

  const totalCharacters = fullText.length;
  const isStoredInChunksOnly = totalCharacters > SOURCE_MAX_STORED_TEXT_CHARS;

  return {
    fullText,
    storedText: isStoredInChunksOnly ? null : fullText,
    totalCharacters,
    isStoredInChunksOnly,
  };
}
