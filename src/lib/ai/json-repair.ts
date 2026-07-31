import { parsePartialJson, type RepairTextFunction } from "ai";

function extractJsonObject(text: string): string | null {
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }

  return text.slice(firstBrace, lastBrace + 1);
}

async function repairJsonCandidate(text: string): Promise<string | null> {
  const result = await parsePartialJson(text);

  if (
    result.state === "failed-parse" ||
    result.state === "undefined-input" ||
    result.value === undefined
  ) {
    return null;
  }

  return JSON.stringify(result.value);
}

/**
 * AI SDK repair hook. Uses `parsePartialJson`, which applies the SDK's `fixJson`
 * helper for truncated or slightly malformed JSON.
 */
export const repairJsonText: RepairTextFunction = async ({ text }) => {
  return repairJsonTextValue(text);
};

export async function repairJsonTextValue(
  text: string,
): Promise<string | null> {
  const candidates = [text, extractJsonObject(text)].filter(
    (candidate): candidate is string =>
      typeof candidate === "string" && candidate.length > 0,
  );

  for (const candidate of candidates) {
    const repaired = await repairJsonCandidate(candidate);
    if (repaired != null) {
      return repaired;
    }
  }

  return null;
}
