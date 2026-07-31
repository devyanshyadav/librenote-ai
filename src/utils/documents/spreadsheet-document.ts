import * as XLSX from "xlsx";
import type { DocumentIngestUnit } from "@/lib/chunks/ingest-drafts";
import type { DocumentExtractResult } from "@/lib/sources/source-ingest/types";
import { sanitizeSourceText } from "@/utils/sources/sanitize-source-text";

function rowsToMarkdown(rows: unknown[][]): string {
  const normalizedRows = rows
    .map((row) =>
      row.map((cell) =>
        cell === null || cell === undefined ? "" : String(cell).trim(),
      ),
    )
    .filter((row) => row.some((cell) => cell.length > 0));

  if (normalizedRows.length === 0) {
    return "";
  }

  const [header, ...body] = normalizedRows;
  const lines = [
    `| ${header.join(" | ")} |`,
    `| ${header.map(() => "---").join(" | ")} |`,
  ];

  for (const row of body) {
    const padded = header.map((_, index) => row[index] ?? "");
    lines.push(`| ${padded.join(" | ")} |`);
  }

  return lines.join("\n");
}

function sheetToMarkdown(sheet: XLSX.WorkSheet): string {
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: false,
  }) as unknown[][];

  return rowsToMarkdown(rows);
}

function buildFullText(units: DocumentIngestUnit[]): string {
  return sanitizeSourceText(units.map((unit) => unit.content).join("\n\n"));
}

export async function extractSpreadsheetDocument(
  buffer: Buffer,
  _extension: string,
): Promise<DocumentExtractResult> {
  const workbook = XLSX.read(buffer, {
    type: "buffer",
    cellDates: true,
  });

  const units: DocumentIngestUnit[] = [];
  let section = 1;

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      continue;
    }

    const markdown = sheetToMarkdown(sheet);
    if (!markdown) {
      continue;
    }

    const heading = workbook.SheetNames.length > 1 ? `## ${sheetName}\n\n` : "";

    units.push({
      kind: "text",
      page: section,
      content: `${heading}${markdown}`,
    });
    section += 1;
  }

  const fullText = buildFullText(units);
  if (!fullText) {
    throw new Error(
      "No data could be extracted from this spreadsheet. It may be empty.",
    );
  }

  return { fullText, units };
}
