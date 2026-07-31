import {
  AppError,
  mapHttpStatusToMessage,
  toUserFacingError,
} from "@/lib/app-error";
import { assertSafeWebUrl } from "@/utils/sources/validate-web-url";

const FETCH_TIMEOUT_MS = 120_000;
const MAX_PDF_BYTES = 50 * 1024 * 1024;

function getPdfTitleFromUrl(url: URL): string {
  const segment = url.pathname.split("/").pop() ?? "document.pdf";
  const decoded = decodeURIComponent(segment.replace(/\.pdf$/i, ""));
  return decoded || "PDF document";
}

export async function fetchPdfBuffer(urlString: string): Promise<{
  buffer: Buffer;
  title: string;
  url: string;
}> {
  const url = await assertSafeWebUrl(urlString);

  let response: Response;

  try {
    response = await fetch(url.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "application/pdf,*/*",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "follow",
    });
  } catch (error) {
    throw toUserFacingError(
      error,
      "Could not reach this PDF. Check the URL and try again.",
    );
  }

  if (!response.ok) {
    throw new AppError(mapHttpStatusToMessage(response.status));
  }

  const contentType = response.headers.get("content-type") ?? "";
  const isPdfContent =
    contentType.includes("application/pdf") ||
    url.pathname.toLowerCase().endsWith(".pdf");

  if (!isPdfContent) {
    throw new AppError("URL does not point to a PDF file.");
  }

  const contentLength = Number(response.headers.get("content-length") ?? "0");
  if (contentLength > MAX_PDF_BYTES) {
    throw new AppError("PDF is too large to import (50MB max).");
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  if (buffer.byteLength > MAX_PDF_BYTES) {
    throw new AppError("PDF is too large to import (50MB max).");
  }

  return {
    buffer,
    title: getPdfTitleFromUrl(url),
    url: url.toString(),
  };
}
