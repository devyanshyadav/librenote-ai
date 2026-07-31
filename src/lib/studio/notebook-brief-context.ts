import type { NotebookBrief } from "@/types";

export function buildBriefContext(brief: NotebookBrief) {
  const sourceSections = brief.sources
    .map((source) => `### ${source.title}\n${source.notes}`)
    .join("\n\n");

  return `Notebook synthesis:
${brief.synthesis}

Key topics: ${brief.topics.join(", ")}

Per-source notes:
${sourceSections}`;
}

export function buildSourceIdList(brief: NotebookBrief) {
  return brief.sources
    .map((source) => `- ${source.sourceId}: ${source.title}`)
    .join("\n");
}
