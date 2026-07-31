import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { sources as sourcesTable } from "@/db/schema";
import { extractSourceKeywords } from "@/lib/chat/extract-source-keywords";
import { NOTEBOOK_CHAT_INSTRUCTIONS } from "@/lib/chat/system-prompt";
import {
  CHAT_SOURCE_CATALOG_MAX_CHARS,
  CHAT_SOURCE_DESCRIPTION_MAX_CHARS,
  CHAT_SOURCE_KEYWORD_SAMPLE_MAX_CHARS,
} from "@/lib/constants";
import { isSectionNotesExtractedText } from "@/lib/sources/source-section-notes";
import type { ChatSourceCatalog, SourceMetadata } from "@/types";

function truncateText(value: string, maxChars: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxChars) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxChars - 1).trimEnd()}…`;
}

function getKeywordText(extractedText: string | null): string | null {
  if (!extractedText?.trim() || isSectionNotesExtractedText(extractedText)) {
    return null;
  }

  return truncateText(
    extractedText.replace(/\s+/g, " ").trim(),
    CHAT_SOURCE_KEYWORD_SAMPLE_MAX_CHARS,
  );
}

export async function getNotebookSourceCatalog(
  notebookId: string,
  sourceIds: string[],
): Promise<ChatSourceCatalog | null> {
  if (sourceIds.length === 0) {
    return null;
  }

  const rows = await db
    .select({
      id: sourcesTable.id,
      title: sourcesTable.title,
      type: sourcesTable.type,
      metadata: sourcesTable.metadata,
      extractedText: sourcesTable.extractedText,
    })
    .from(sourcesTable)
    .where(
      and(
        eq(sourcesTable.notebookId, notebookId),
        inArray(sourcesTable.id, sourceIds),
      ),
    );

  const rowById = new Map(rows.map((row) => [row.id, row]));
  const sources = sourceIds.flatMap((sourceId) => {
    const row = rowById.get(sourceId);
    if (!row) {
      return [];
    }

    const metadata = row.metadata as SourceMetadata | null;
    const description = metadata?.description?.trim();
    const keywordText = getKeywordText(row.extractedText);

    return [
      {
        title: row.title,
        type: row.type,
        description: description
          ? truncateText(description, CHAT_SOURCE_DESCRIPTION_MAX_CHARS)
          : null,
        keywords: keywordText
          ? extractSourceKeywords(keywordText, {
              title: row.title,
              languageCode: metadata?.languageCode,
            })
          : [],
      },
    ];
  });

  return { sources };
}

function formatSourceCatalog(catalog: ChatSourceCatalog): string {
  const lines: string[] = [`## ACTIVE SOURCES (${catalog.sources.length})`, ""];

  let charCount = lines.join("\n").length;

  for (const [index, source] of catalog.sources.entries()) {
    const blockLines = [
      `${index + 1}. **${source.title}**`,
      `Type: ${source.type}`,
    ];

    if (source.description) {
      blockLines.push(`Description: ${source.description}`);
    }

    if (source.keywords.length > 0) {
      blockLines.push(`Keywords: ${source.keywords.join(", ")}`);
    }

    const block = `${blockLines.join("\n")}\n`;
    if (charCount + block.length > CHAT_SOURCE_CATALOG_MAX_CHARS) {
      lines.push(
        `…and ${catalog.sources.length - index} more source(s) omitted.`,
      );
      break;
    }

    lines.push(block.trimEnd(), "");
    charCount += block.length;
  }

  return lines.join("\n").trim();
}

export function buildNotebookChatInstructions(
  catalog: ChatSourceCatalog | null,
): string {
  if (!catalog || catalog.sources.length === 0) {
    return `${NOTEBOOK_CHAT_INSTRUCTIONS}

## ACTIVE SOURCES

No documents are currently selected. Tell the user to select ready sources in the sidebar before asking document questions.`;
  }

  return `${NOTEBOOK_CHAT_INSTRUCTIONS}

${formatSourceCatalog(catalog)}`;
}
