export function stripMermaidFences(rawCode: string): string {
  return rawCode
    .trim()
    .replace(/^```mermaid\s*/i, "")
    .replace(/```$/, "")
    .trim();
}
