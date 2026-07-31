import { parseHTML } from "linkedom";
import mammoth from "mammoth";
import WordExtractor from "word-extractor";
import type { DocumentIngestUnit } from "@/lib/chunks/ingest-drafts";
import type { ExtractPdfDocumentResult } from "@/utils/documents/pdf-document";
import {
  extractEmbeddedImages,
  isOfficeOpenXmlBuffer,
} from "@/utils/documents/office-buffer";
import { sanitizeSourceText } from "@/utils/sources/sanitize-source-text";

const legacyDocExtractor = new WordExtractor();

const FIGURE_SRC_PREFIX = "figure://";
const BLOCK_TAGS = new Set([
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "li",
  "blockquote",
  "pre",
  "div",
]);

interface CollectedFigure {
  buffer: Buffer;
  contentType: string;
  caption: string;
}

interface WalkState {
  units: DocumentIngestUnit[];
  figures: CollectedFigure[];
  currentText: string;
  section: number;
}

function resolveWordDocumentKind(
  fileExt: string,
  buffer: Buffer,
): "docx" | "doc" {
  if (
    fileExt === "docx" ||
    (fileExt === "doc" && isOfficeOpenXmlBuffer(buffer))
  ) {
    return "docx";
  }

  return "doc";
}

function tableToMarkdown(table: Element): string {
  const rows = Array.from(table.querySelectorAll("tr"));
  if (rows.length === 0) {
    return "";
  }

  const lines: string[] = [];

  for (const [rowIndex, row] of rows.entries()) {
    const cells = Array.from(row.querySelectorAll("th, td")).map(
      (cell) => cell.textContent?.replace(/\s+/g, " ").trim() ?? "",
    );

    if (cells.length === 0) {
      continue;
    }

    lines.push(`| ${cells.join(" | ")} |`);

    if (rowIndex === 0) {
      lines.push(`| ${cells.map(() => "---").join(" | ")} |`);
    }
  }

  return lines.join("\n");
}

function appendText(state: WalkState, value: string) {
  if (!value) {
    return;
  }

  state.currentText = state.currentText
    ? `${state.currentText}\n\n${value}`
    : value;
}

function flushText(state: WalkState) {
  const text = sanitizeSourceText(state.currentText);
  state.currentText = "";

  if (!text) {
    return;
  }

  state.units.push({
    kind: "text",
    page: state.section,
    content: text,
  });
  state.section += 1;
}

function pushFigure(state: WalkState, figureNumber: number) {
  const figure = state.figures[figureNumber - 1];
  if (!figure) {
    return;
  }

  state.units.push({
    kind: "figure",
    page: state.section,
    content: figure.caption,
    imageBuffer: figure.buffer,
    imageContentType: figure.contentType,
  });
  state.section += 1;
}

function walkNode(node: Node, state: WalkState) {
  if (node.nodeType === 3) {
    const text = node.textContent?.replace(/\s+/g, " ").trim();
    if (text) {
      state.currentText = state.currentText
        ? `${state.currentText} ${text}`
        : text;
    }
    return;
  }

  if (node.nodeType !== 1) {
    return;
  }

  const element = node as Element;
  const tag = element.tagName.toLowerCase();

  if (tag === "img") {
    const src = element.getAttribute("src") ?? "";
    if (src.startsWith(FIGURE_SRC_PREFIX)) {
      flushText(state);
      pushFigure(state, Number(src.slice(FIGURE_SRC_PREFIX.length)));
      return;
    }
  }

  if (tag === "table") {
    const markdown = tableToMarkdown(element);
    if (markdown) {
      appendText(state, markdown);
    }
    return;
  }

  if (tag === "br") {
    state.currentText = state.currentText ? `${state.currentText}\n` : "";
    return;
  }

  for (const child of element.childNodes) {
    walkNode(child, state);
  }

  if (BLOCK_TAGS.has(tag)) {
    state.currentText = state.currentText ? `${state.currentText}\n` : "";
  }
}

function htmlToIngestUnits(
  html: string,
  figures: CollectedFigure[],
): DocumentIngestUnit[] {
  const { document } = parseHTML(`<div id="word-root">${html}</div>`);
  const root = document.getElementById("word-root");
  const state: WalkState = {
    units: [],
    figures,
    currentText: "",
    section: 1,
  };

  if (root) {
    walkNode(root, state);
  }

  flushText(state);
  return state.units;
}

function buildFullText(units: DocumentIngestUnit[]): string {
  return sanitizeSourceText(units.map((unit) => unit.content).join("\n\n"));
}

async function extractDocxDocument(
  buffer: Buffer,
): Promise<ExtractPdfDocumentResult> {
  const figures: CollectedFigure[] = [];

  const result = await mammoth.convertToHtml(
    { buffer },
    {
      convertImage: mammoth.images.imgElement(async (image) => {
        const figureNumber = figures.length + 1;
        const imageBuffer = await image.readAsBuffer();

        figures.push({
          buffer: imageBuffer,
          contentType: image.contentType,
          caption: `Figure ${figureNumber}`,
        });

        return {
          src: `${FIGURE_SRC_PREFIX}${figureNumber}`,
        };
      }),
    },
  );

  const units = htmlToIngestUnits(result.value, figures);
  const fullText = buildFullText(units);

  if (!fullText) {
    throw new Error(
      "No text could be extracted from this DOCX file. It may be empty, scanned, or password-protected.",
    );
  }

  return { units, fullText };
}

async function extractLegacyDocText(buffer: Buffer): Promise<string> {
  const document = await legacyDocExtractor.extract(buffer);
  const text = sanitizeSourceText(document.getBody());

  if (!text) {
    throw new Error(
      "No text could be extracted from this Word file. It may be empty, scanned, or password-protected.",
    );
  }

  return text;
}

async function extractLegacyDocDocument(
  buffer: Buffer,
): Promise<ExtractPdfDocumentResult> {
  const fullText = await extractLegacyDocText(buffer);
  const units: DocumentIngestUnit[] = [
    { kind: "text", page: 1, content: fullText },
  ];

  let section = 2;
  for (const figure of extractEmbeddedImages(buffer)) {
    units.push({
      kind: "figure",
      page: section,
      content: figure.caption,
      imageBuffer: figure.buffer,
      imageContentType: figure.contentType,
    });
    section += 1;
  }

  return {
    units,
    fullText: buildFullText(units),
  };
}

export async function extractWordDocument(
  buffer: Buffer,
  fileExt: string,
): Promise<ExtractPdfDocumentResult> {
  return resolveWordDocumentKind(fileExt, buffer) === "docx"
    ? extractDocxDocument(buffer)
    : extractLegacyDocDocument(buffer);
}
