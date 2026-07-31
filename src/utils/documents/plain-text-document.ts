import { parseHTML } from "linkedom";
import type { DocumentExtractResult } from "@/lib/sources/source-ingest/types";
import { sanitizeSourceText } from "@/utils/sources/sanitize-source-text";

function extractHtmlText(buffer: Buffer): string {
  const { document } = parseHTML(buffer.toString("utf-8"));
  for (const element of document.querySelectorAll("script, style, noscript")) {
    element.remove();
  }

  return sanitizeSourceText(document.body?.textContent ?? "");
}

function extractJsonText(buffer: Buffer): string {
  const parsed: unknown = JSON.parse(buffer.toString("utf-8"));
  return sanitizeSourceText(JSON.stringify(parsed, null, 2));
}

export async function extractPlainTextDocument(
  buffer: Buffer,
  extension: string,
): Promise<DocumentExtractResult> {
  let fullText = "";

  switch (extension) {
    case "json":
      fullText = extractJsonText(buffer);
      break;
    case "html":
    case "htm":
      fullText = extractHtmlText(buffer);
      break;
    default:
      fullText = sanitizeSourceText(buffer.toString("utf-8"));
  }

  if (!fullText) {
    throw new Error(
      "No text could be extracted from this file. It may be empty or invalid.",
    );
  }

  return {
    fullText,
    units: [{ kind: "text", page: 1, content: fullText }],
  };
}
