import "pdf-parse/worker";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PDFParse } from "pdf-parse";
import { CanvasFactory, getData } from "pdf-parse/worker";
import { PDF_FIGURE_UPLOAD_CONCURRENCY } from "@/lib/constants";
import type { DocumentIngestUnit } from "@/lib/chunks/ingest-drafts";
import { runWithConcurrency } from "@/utils/async/run-with-concurrency";
import { sanitizeSourceText } from "@/utils/sources/sanitize-source-text";

let workerReady = false;

function ensurePdfWorker(): void {
  if (workerReady) {
    return;
  }

  PDFParse.setWorker(getData());
  workerReady = true;
}

function toPdfData(buffer: Buffer): Uint8Array {
  return new Uint8Array(
    buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    ),
  );
}

async function withPdfParser<T>(
  buffer: Buffer,
  run: (parser: PDFParse) => Promise<T>,
): Promise<T> {
  ensurePdfWorker();

  const parser = new PDFParse({
    data: toPdfData(buffer),
    CanvasFactory,
  });

  try {
    return await run(parser);
  } finally {
    await parser.destroy();
  }
}

function detectImageContentType(data: Uint8Array): string {
  if (data[0] === 0x89 && data[1] === 0x50) {
    return "image/png";
  }

  if (data[0] === 0xff && data[1] === 0xd8) {
    return "image/jpeg";
  }

  return "image/png";
}

export interface ExtractPdfDocumentOptions {
  /** Read PDF metadata title (extra pass — use for URL imports only) */
  includeTitle?: boolean;
  /** Extract embedded images (skip for text-only paths) */
  includeImages?: boolean;
}

export interface ExtractPdfDocumentResult {
  units: DocumentIngestUnit[];
  fullText: string;
  title?: string;
}

export async function extractPdfPlainText(buffer: Buffer): Promise<string> {
  const { fullText } = await extractPdfDocument(buffer, {
    includeImages: false,
  });
  return fullText;
}

export async function extractPdfDocument(
  buffer: Buffer,
  options: ExtractPdfDocumentOptions = {},
): Promise<ExtractPdfDocumentResult> {
  const { includeTitle = false, includeImages = true } = options;

  return withPdfParser(buffer, async (parser) => {
    const textResult = await parser.getText();
    const fullText = sanitizeSourceText(textResult.text);

    const imageResult = includeImages
      ? await parser.getImage({
          imageThreshold: 0,
          imageDataUrl: false,
          imageBuffer: true,
        })
      : null;

    const imagesByPage = new Map(
      (imageResult?.pages ?? []).map((page) => [page.pageNumber, page.images]),
    );

    const units: DocumentIngestUnit[] = [];
    let figureIndex = 0;

    for (const page of textResult.pages) {
      const pageText = sanitizeSourceText(page.text);

      if (pageText) {
        units.push({
          kind: "text",
          page: page.num,
          content: pageText,
        });
      }

      for (const image of imagesByPage.get(page.num) ?? []) {
        figureIndex += 1;

        const caption = `Figure ${figureIndex} (page ${page.num})`;
        const pageContext = pageText.trim().slice(0, 800);
        const content = pageContext ? `${caption}\n\n${pageContext}` : caption;

        units.push({
          kind: "figure",
          page: page.num,
          content,
          imageBuffer: Buffer.from(image.data),
          imageContentType: detectImageContentType(image.data),
        });
      }
    }

    if (!fullText && units.length === 0) {
      throw new Error("No text could be extracted from the PDF.");
    }

    let title: string | undefined;
    if (includeTitle) {
      const info = await parser.getInfo();
      const metadataTitle = info.info?.Title;
      title =
        typeof metadataTitle === "string" ? metadataTitle.trim() : undefined;
    }

    return { units, fullText, title: title || undefined };
  });
}

export async function uploadIngestFigureImages(
  supabase: SupabaseClient,
  userId: string,
  sourceId: string,
  units: DocumentIngestUnit[],
): Promise<DocumentIngestUnit[]> {
  const output: DocumentIngestUnit[] = units.map((unit) => ({
    kind: unit.kind,
    page: unit.page,
    content: unit.content,
  }));

  const figureUploads = units
    .map((unit, unitIndex) => ({ unit, unitIndex }))
    .filter(
      (
        item,
      ): item is {
        unit: DocumentIngestUnit & { imageBuffer: Buffer };
        unitIndex: number;
      } => item.unit.kind === "figure" && !!item.unit.imageBuffer,
    );

  if (figureUploads.length === 0) {
    return output;
  }

  await runWithConcurrency(
    figureUploads,
    PDF_FIGURE_UPLOAD_CONCURRENCY,
    async ({ unit, unitIndex }, figureIndex) => {
      const contentType = unit.imageContentType ?? "image/png";
      const extension =
        contentType === "image/jpeg"
          ? "jpg"
          : contentType === "image/gif"
            ? "gif"
            : contentType === "image/webp"
              ? "webp"
              : contentType === "image/bmp"
                ? "bmp"
                : "png";
      const storagePath = `${userId}/${sourceId}/figures/p${unit.page}-f${figureIndex + 1}.${extension}`;

      const { data, error } = await supabase.storage
        .from("sources")
        .upload(storagePath, unit.imageBuffer, {
          cacheControl: "3600",
          upsert: true,
          contentType,
        });

      if (error) {
        throw new Error(`Storage upload failed: ${error.message}`);
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("sources").getPublicUrl(data.path);

      output[unitIndex] = {
        kind: "figure",
        page: unit.page,
        content: unit.content,
        imageUrl: publicUrl,
      };
    },
  );

  return output;
}
