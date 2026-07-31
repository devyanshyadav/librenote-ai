import { commitSourceIngest } from "@/lib/sources/source-ingest/commit";
import { resolveSourceTitle } from "@/lib/sources/source-ingest/types";
import { AppError, toUserFacingError } from "@/lib/app-error";
import type { CreatePendingSourceResult } from "@/utils/sources/ingest-source";
import { fetchPdfBuffer } from "@/utils/sources/fetch-pdf-content";
import { fetchWebContent } from "@/utils/sources/fetch-web-content";
import { fetchYouTubeTranscript } from "@/utils/sources/fetch-youtube-transcript";
import { extractPdfDocument } from "@/utils/documents/pdf-document";
import {
  detectLinkSourceType,
  resolveArxivPdfUrl,
  type LinkSourceType,
} from "@/utils/sources/source-url";

async function ingestPdfFromUrl(input: {
  userId: string;
  notebookId: string;
  url: string;
  title?: string;
}): Promise<CreatePendingSourceResult> {
  const {
    buffer,
    title: urlTitle,
    url: pdfUrl,
  } = await fetchPdfBuffer(input.url);

  let units;
  let fullText;
  let pdfTitle;

  try {
    ({
      units,
      fullText,
      title: pdfTitle,
    } = await extractPdfDocument(buffer, {
      includeTitle: true,
    }));
  } catch (error) {
    throw toUserFacingError(
      error,
      "Could not read this PDF. The file may be corrupted or password-protected.",
    );
  }

  return commitSourceIngest(input.userId, {
    notebookId: input.notebookId,
    title: resolveSourceTitle(input.title, pdfTitle ?? urlTitle),
    type: "pdf",
    extractedText: fullText,
    sourceUrl: pdfUrl,
    storagePath: null,
    structuredUnits: units,
  });
}

const LINK_HANDLERS: Record<
  LinkSourceType,
  (input: {
    userId: string;
    notebookId: string;
    url: string;
    title?: string;
  }) => Promise<CreatePendingSourceResult>
> = {
  youtube: async ({ userId, notebookId, url, title }) => {
    const video = await fetchYouTubeTranscript(url);
    return commitSourceIngest(userId, {
      notebookId,
      title: resolveSourceTitle(title, video.title),
      type: "youtube",
      extractedText: video.text,
      sourceUrl: video.url,
      storagePath: null,
      metadata: video.metadata,
    });
  },
  arxiv: async ({ userId, notebookId, url, title }) => {
    const pdfUrl = resolveArxivPdfUrl(url);
    if (!pdfUrl) {
      throw new AppError("Could not resolve arXiv PDF URL.");
    }

    return ingestPdfFromUrl({ userId, notebookId, url: pdfUrl, title });
  },
  pdf: ingestPdfFromUrl,
  web: async ({ userId, notebookId, url, title }) => {
    const page = await fetchWebContent(url);
    return commitSourceIngest(userId, {
      notebookId,
      title: resolveSourceTitle(title, page.title),
      type: "web",
      extractedText: page.text,
      sourceUrl: page.url,
      storagePath: null,
      metadata: page.metadata,
    });
  },
};

export async function ingestLinkSource(input: {
  userId: string;
  notebookId: string;
  url: string;
  title?: string;
}): Promise<CreatePendingSourceResult> {
  try {
    return await LINK_HANDLERS[detectLinkSourceType(input.url)](input);
  } catch (error) {
    throw toUserFacingError(
      error,
      "Failed to import this link. Please try again.",
    );
  }
}
