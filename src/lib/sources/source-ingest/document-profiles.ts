import type {
  DocumentExtractResult,
  DocumentIngestProfile,
} from "@/lib/sources/source-ingest/types";
import { extractPdfDocument } from "@/utils/documents/pdf-document";
import { extractPlainTextDocument } from "@/utils/documents/plain-text-document";
import { extractSpreadsheetDocument } from "@/utils/documents/spreadsheet-document";
import { getFileExtension } from "@/utils/sources/source-file";
import { extractWordDocument } from "@/utils/documents/word-document";

const PROFILES: DocumentIngestProfile[] = [
  {
    id: "pdf",
    extensions: ["pdf"],
    sourceType: "pdf",
    structured: true,
    extract: async (buffer) => toResult(await extractPdfDocument(buffer)),
  },
  {
    id: "word",
    extensions: ["doc", "docx"],
    sourceType: "word",
    structured: true,
    extract: async (buffer, extension) =>
      toResult(await extractWordDocument(buffer, extension)),
  },
  {
    id: "spreadsheet",
    extensions: ["xls", "xlsx", "csv"],
    sourceType: "spreadsheet",
    structured: true,
    extract: extractSpreadsheetDocument,
  },
  {
    id: "plain-text",
    extensions: ["txt", "md", "json", "html", "htm"],
    sourceType: "text_note",
    structured: false,
    extract: extractPlainTextDocument,
  },
];

const profileByExtension = new Map<string, DocumentIngestProfile>();

for (const profile of PROFILES) {
  for (const extension of profile.extensions) {
    profileByExtension.set(extension, profile);
  }
}

function toResult(result: {
  fullText: string;
  units: DocumentExtractResult["units"];
  title?: string;
}): DocumentExtractResult {
  return {
    fullText: result.fullText,
    units: result.units,
    title: result.title,
  };
}

export function resolveDocumentIngestProfile(
  fileName: string,
): DocumentIngestProfile {
  const extension = getFileExtension(fileName);
  const profile = profileByExtension.get(extension);

  if (profile) {
    return profile;
  }

  throw new Error(
    `${fileName} is not a supported file type. Use PDF, Word, Excel, TXT, MD, JSON, or HTML.`,
  );
}
