import { parseYouTubeVideoId } from "@/utils/sources/validate-youtube-url";

export type LinkSourceType = "youtube" | "arxiv" | "pdf" | "web";

function normalizeUrlInput(input: string): string {
  const trimmed = input.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function parseLinkUrls(input: string): string[] {
  return [
    ...new Set(
      input
        .split(/[\n,]+/)
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ];
}

export function resolveArxivPdfUrl(input: string): string | null {
  try {
    const url = new URL(normalizeUrlInput(input));
    const host = url.hostname.replace(/^www\./, "").toLowerCase();

    if (host !== "arxiv.org") {
      return null;
    }

    const absMatch = url.pathname.match(/^\/abs\/(.+)$/);
    if (absMatch) {
      return `https://arxiv.org/pdf/${absMatch[1]}.pdf`;
    }

    const pdfMatch = url.pathname.match(/^\/pdf\/(.+)$/);
    if (pdfMatch) {
      const paperId = pdfMatch[1].replace(/\.pdf$/i, "");
      return `https://arxiv.org/pdf/${paperId}.pdf`;
    }
  } catch {}

  return null;
}

export function isPdfUrl(input: string): boolean {
  try {
    const url = new URL(normalizeUrlInput(input));
    return url.pathname.toLowerCase().endsWith(".pdf");
  } catch {
    return false;
  }
}

export function detectLinkSourceType(input: string): LinkSourceType {
  if (parseYouTubeVideoId(input)) {
    return "youtube";
  }

  if (resolveArxivPdfUrl(input)) {
    return "arxiv";
  }

  if (isPdfUrl(input)) {
    return "pdf";
  }

  return "web";
}

export function getLinkSourceTypeLabel(type: LinkSourceType): string {
  switch (type) {
    case "youtube":
      return "YouTube";
    case "arxiv":
      return "arXiv PDF";
    case "pdf":
      return "PDF";
    default:
      return "Website";
  }
}
