import { sourceSectionNotesSchema, type SourceSectionNotes } from "@/types";

const SECTION_NOTES_PREFIX = "<source-sections";

export function isSectionNotesExtractedText(
  text: string | null | undefined,
): boolean {
  return text?.trimStart().startsWith(SECTION_NOTES_PREFIX) ?? false;
}

export function serializeSectionNotesToExtractedText(
  sectionNotes: SourceSectionNotes[],
  chunkCount: number,
): string {
  const sections = sectionNotes
    .map((section, index) => {
      const lines = [`<section index="${index + 1}">`];

      if (section.mainTopics.length > 0) {
        lines.push(`<topics>${section.mainTopics.join("; ")}</topics>`);
      }

      if (section.keyPoints.length > 0) {
        lines.push(
          `<key-points>\n${section.keyPoints.map((point) => `- ${point}`).join("\n")}\n</key-points>`,
        );
      }

      if (section.conclusions.length > 0) {
        lines.push(
          `<conclusions>\n${section.conclusions.map((item) => `- ${item}`).join("\n")}\n</conclusions>`,
        );
      }

      lines.push("</section>");
      return lines.join("\n");
    })
    .join("\n\n");

  return `<source-sections chunk-count="${chunkCount}">\n${sections}\n</source-sections>`;
}

function parseListItems(block: string): string[] {
  return block
    .split("\n")
    .map((line) => line.replace(/^\s*-\s*/, "").trim())
    .filter(Boolean);
}

function parseSectionBody(body: string): SourceSectionNotes {
  const topicsMatch = body.match(/<topics>([\s\S]*?)<\/topics>/);
  const keyPointsMatch = body.match(/<key-points>([\s\S]*?)<\/key-points>/);
  const conclusionsMatch = body.match(/<conclusions>([\s\S]*?)<\/conclusions>/);

  return {
    mainTopics: topicsMatch
      ? topicsMatch[1]
          .split(";")
          .map((topic) => topic.trim())
          .filter(Boolean)
      : [],
    keyPoints: keyPointsMatch ? parseListItems(keyPointsMatch[1]) : [],
    conclusions: conclusionsMatch ? parseListItems(conclusionsMatch[1]) : [],
  };
}

export function parseSectionNotesFromExtractedText(text: string): {
  sectionNotes: SourceSectionNotes[];
  chunkCount: number;
} | null {
  if (!isSectionNotesExtractedText(text)) {
    return null;
  }

  const chunkCountMatch = text.match(/chunk-count="(\d+)"/);
  const chunkCount = chunkCountMatch ? Number(chunkCountMatch[1]) : 0;
  const sectionMatches = [
    ...text.matchAll(/<section[^>]*>([\s\S]*?)<\/section>/g),
  ];
  const sectionNotes = sectionMatches.map((match) =>
    parseSectionBody(match[1]),
  );
  const parsed = sourceSectionNotesSchema.array().safeParse(sectionNotes);

  if (!parsed.success || parsed.data.length === 0) {
    return null;
  }

  return {
    sectionNotes: parsed.data,
    chunkCount,
  };
}

export function getSourceSectionNotes(
  extractedText: string | null | undefined,
): SourceSectionNotes[] | null {
  if (!extractedText) {
    return null;
  }

  return (
    parseSectionNotesFromExtractedText(extractedText)?.sectionNotes ?? null
  );
}

export function hasValidSourceSectionNotes(
  extractedText: string | null | undefined,
  chunkCount: number,
): boolean {
  const parsed = extractedText
    ? parseSectionNotesFromExtractedText(extractedText)
    : null;

  return parsed !== null && parsed.chunkCount === chunkCount;
}

export function formatSectionNotesForModel(
  title: string,
  sectionNotes: SourceSectionNotes[],
): string {
  const sections = sectionNotes
    .map((section, index) => {
      const topics =
        section.mainTopics.length > 0
          ? `Topics: ${section.mainTopics.join("; ")}`
          : null;
      const points =
        section.keyPoints.length > 0
          ? `Key points:\n${section.keyPoints.map((point) => `- ${point}`).join("\n")}`
          : null;
      const conclusions =
        section.conclusions.length > 0
          ? `Conclusions:\n${section.conclusions.map((item) => `- ${item}`).join("\n")}`
          : null;

      return [`### Section ${index + 1}`, topics, points, conclusions]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");

  return `Source: ${title}\n\n${sections}`;
}
