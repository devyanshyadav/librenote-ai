import { marked } from "marked";

marked.setOptions({
  gfm: true,
  breaks: true,
});

function looksLikeHtml(value: string): boolean {
  return /^<([a-z][a-z0-9]*)\b[^>]*>/i.test(value.trim());
}

export function stripChatCitations(text: string): string {
  return text
    .replace(/\[\^[^\]]*\]/gi, "")
    .replace(/[ \t]+([,.;:!?])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+$/gm, "")
    .trim();
}

export function markdownToNoteHtml(markdown: string): string {
  const trimmed = markdown.trim();
  if (!trimmed) {
    return "";
  }

  if (looksLikeHtml(trimmed)) {
    return trimmed;
  }

  return marked.parse(trimmed) as string;
}

export function normalizeNoteBodyForCreate(body: string): string {
  return markdownToNoteHtml(stripChatCitations(body));
}

export function noteHtmlToPlainText(html: string): string {
  if (!html.trim()) {
    return "";
  }

  if (typeof document === "undefined") {
    return stripChatCitations(
      html
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
    );
  }

  const doc = new DOMParser().parseFromString(html, "text/html");
  return stripChatCitations(doc.body.innerText.replace(/\u00a0/g, " ").trim());
}

function sanitizeFilename(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^\w-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "note";
}

export function downloadTextFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadNoteAsText(title: string, bodyHtml: string): void {
  const body = noteHtmlToPlainText(bodyHtml);
  const content = title.trim() ? `${title.trim()}\n\n${body}` : body;

  downloadTextFile(`${sanitizeFilename(title)}.txt`, content);
}
