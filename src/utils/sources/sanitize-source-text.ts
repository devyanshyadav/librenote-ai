const C0_CONTROL_PATTERN = new RegExp(
  `[${String.fromCharCode(1)}-${String.fromCharCode(8)}${String.fromCharCode(11)}${String.fromCharCode(12)}${String.fromCharCode(14)}-${String.fromCharCode(31)}${String.fromCharCode(127)}]`,
  "g",
);

/**
 * PDF and document parsers often emit C0 control bytes (especially `\0`)
 * that PostgreSQL text columns reject. Strip them before chunking/storage.
 */
export function sanitizeSourceText(text: string): string {
  return text
    .replaceAll("\0", "")
    .replace(C0_CONTROL_PATTERN, " ")
    .replaceAll("\uFEFF", "")
    .replace(/\s+/g, " ")
    .trim();
}
