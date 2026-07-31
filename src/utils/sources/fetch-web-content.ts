import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import {
  AppError,
  mapHttpStatusToMessage,
  toUserFacingError,
} from "@/lib/app-error";
import type { WebSourceMetadata } from "@/types";
import { assertSafeWebUrl } from "@/utils/sources/validate-web-url";

const FETCH_TIMEOUT_MS = 15_000;
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;
const MIN_EXTRACTED_CHARS = 20;

export interface WebPageContent {
  title: string;
  text: string;
  url: string;
  metadata: WebSourceMetadata;
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function stripNoiseFromDocument(document: Document): void {
  for (const element of document.querySelectorAll(
    "script, style, noscript, svg, iframe",
  )) {
    element.remove();
  }
}

function extractMetaContent(
  document: Document,
  selectors: string[],
  minLength = MIN_EXTRACTED_CHARS,
): string {
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    const content = element?.getAttribute("content")?.trim();
    if (content && content.length >= minLength) {
      return normalizeWhitespace(content);
    }
  }

  return "";
}

function extractFromJsonLd(html: string): string {
  const matches = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );

  for (const match of matches) {
    try {
      const parsed = JSON.parse(match[1]) as unknown;
      const items = Array.isArray(parsed) ? parsed : [parsed];

      for (const item of items) {
        if (!item || typeof item !== "object") continue;

        const record = item as Record<string, unknown>;
        const candidates = [
          record.articleBody,
          record.description,
          record.text,
        ];

        for (const candidate of candidates) {
          if (typeof candidate === "string") {
            const text = normalizeWhitespace(candidate);
            if (text.length >= MIN_EXTRACTED_CHARS) {
              return text;
            }
          }
        }
      }
    } catch {}
  }

  return "";
}

function extractFromLandmarks(document: Document): string {
  const selectors = [
    "article",
    "main",
    '[role="main"]',
    ".post-content",
    ".article-content",
    ".article-body",
    ".entry-content",
    ".markdown-body",
    "#content",
    "#main-content",
  ];

  for (const selector of selectors) {
    const node = document.querySelector(selector);
    if (!node?.textContent) continue;

    const text = normalizeWhitespace(node.textContent);
    if (text.length >= MIN_EXTRACTED_CHARS) {
      return text;
    }
  }

  return "";
}

function fallbackExtractText(html: string): string {
  const { document } = parseHTML(html);
  stripNoiseFromDocument(document);
  return normalizeWhitespace(document.body?.textContent ?? "");
}

function extractMetaDescription(document: Document): string {
  return extractMetaContent(
    document,
    [
      'meta[property="og:description"]',
      'meta[name="description"]',
      'meta[name="twitter:description"]',
    ],
    1,
  );
}

function looksLikeJavaScriptShell(text: string, html: string): boolean {
  const lowerHtml = html.toLowerCase();
  const hasRootShell =
    lowerHtml.includes('id="root"') ||
    lowerHtml.includes('id="__next"') ||
    lowerHtml.includes('id="app"');

  return hasRootShell && text.length < MIN_EXTRACTED_CHARS;
}

function pickBestText(candidates: string[]): string {
  return (
    candidates
      .map(normalizeWhitespace)
      .filter((text) => text.length > 0)
      .sort((a, b) => b.length - a.length)[0] ?? ""
  );
}

function resolveAbsoluteUrl(baseUrl: string, value: string): string | null {
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return null;
  }
}

function extractPageTitle(document: Document, fallback: string): string {
  return (
    document
      .querySelector('meta[property="og:title"]')
      ?.getAttribute("content")
      ?.trim() ||
    document
      .querySelector('meta[name="twitter:title"]')
      ?.getAttribute("content")
      ?.trim() ||
    document.querySelector("title")?.textContent?.trim() ||
    fallback
  );
}

function extractSiteName(document: Document): string | null {
  const siteName =
    document
      .querySelector('meta[property="og:site_name"]')
      ?.getAttribute("content")
      ?.trim() ||
    document
      .querySelector('meta[name="application-name"]')
      ?.getAttribute("content")
      ?.trim();

  return siteName || null;
}

function extractOgImage(document: Document, pageUrl: string): string | null {
  const imageUrl =
    document
      .querySelector('meta[property="og:image"]')
      ?.getAttribute("content")
      ?.trim() ||
    document
      .querySelector('meta[name="twitter:image"]')
      ?.getAttribute("content")
      ?.trim();

  if (!imageUrl) {
    return null;
  }

  return resolveAbsoluteUrl(pageUrl, imageUrl);
}

function extractFaviconUrl(document: Document, pageUrl: string): string | null {
  const iconSelectors = [
    'link[rel="icon"]',
    'link[rel="shortcut icon"]',
    'link[rel="apple-touch-icon"]',
    'link[rel="apple-touch-icon-precomposed"]',
  ];

  for (const selector of iconSelectors) {
    const href = document.querySelector(selector)?.getAttribute("href")?.trim();
    if (!href) continue;

    const resolved = resolveAbsoluteUrl(pageUrl, href);
    if (resolved) {
      return resolved;
    }
  }

  try {
    return `${new URL(pageUrl).origin}/favicon.ico`;
  } catch {
    return null;
  }
}

function extractWebPageMetadata(
  document: Document,
  pageUrl: string,
  title: string,
  description: string | null,
): WebSourceMetadata {
  const url = new URL(pageUrl);

  return {
    url: url.toString(),
    title,
    description,
    faviconUrl: extractFaviconUrl(document, pageUrl),
    siteName: extractSiteName(document),
    imageUrl: extractOgImage(document, pageUrl),
    hostname: url.hostname.replace(/^www\./, ""),
  };
}

export async function fetchWebContent(
  urlString: string,
): Promise<WebPageContent> {
  const url = await assertSafeWebUrl(urlString);

  let response: Response;

  try {
    response = await fetch(url.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "follow",
    });
  } catch (error) {
    throw toUserFacingError(
      error,
      "Could not reach this website. Check the URL and try again.",
    );
  }

  if (!response.ok) {
    throw new AppError(mapHttpStatusToMessage(response.status));
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (
    !contentType.includes("text/html") &&
    !contentType.includes("application/xhtml") &&
    !contentType.includes("text/plain")
  ) {
    throw new AppError("URL must point to an HTML web page.");
  }

  const contentLength = Number(response.headers.get("content-length") ?? "0");
  if (contentLength > MAX_RESPONSE_BYTES) {
    throw new AppError("Page is too large to import.");
  }

  const html = await response.text();

  if (html.length > MAX_RESPONSE_BYTES) {
    throw new AppError("Page is too large to import.");
  }

  if (!html.trim()) {
    throw new AppError("The page returned empty content.");
  }

  const { document } = parseHTML(html);
  const metaText = extractMetaDescription(document);
  const metaTextForContent =
    metaText.length >= MIN_EXTRACTED_CHARS ? metaText : "";
  const jsonLdText = extractFromJsonLd(html);
  const landmarkText = extractFromLandmarks(document);
  const fallbackText = fallbackExtractText(html);

  const reader = new Readability(document, { charThreshold: 0 });
  const article = reader.parse();

  const text = pickBestText([
    article?.textContent ?? "",
    landmarkText,
    fallbackText,
    jsonLdText,
    metaTextForContent,
  ]);

  if (text.length < MIN_EXTRACTED_CHARS) {
    if (looksLikeJavaScriptShell(text, html)) {
      throw new AppError(
        "This page loads content with JavaScript. Static import cannot read it yet.",
      );
    }

    throw new AppError(
      "Could not extract enough readable content from this page. Try uploading a PDF or pasted text instead.",
    );
  }

  const title =
    article?.title?.trim() || extractPageTitle(document, url.hostname);

  const description = metaText || null;

  return {
    title,
    text,
    url: url.toString(),
    metadata: extractWebPageMetadata(
      document,
      url.toString(),
      title,
      description,
    ),
  };
}
