import type { MindMapDetailLevel, StudioGenerateOptions } from "@/types";

export const MIND_MAP_DETAIL_LEVEL_OPTIONS: {
  value: MindMapDetailLevel;
  label: string;
  description: string;
}[] = [
  {
    value: "shallow",
    label: "High-level",
    description: "Root plus major themes only (2 levels).",
  },
  {
    value: "balanced",
    label: "Balanced",
    description:
      "Multi-level drill-down — root → themes → sub-themes → details.",
  },
  {
    value: "deep",
    label: "Deep",
    description:
      "Deeper nesting with more branches per level and richer leaf nodes.",
  },
];

const DETAIL_BY_LEVEL: Record<MindMapDetailLevel, string> = {
  shallow: "High-level: root + 4–6 themes (~6–10 nodes, 2 levels).",
  balanced:
    "Balanced (~22–32 nodes): drill each theme through sub-themes to concrete details (4+ levels).",
  deep: "Deep (~32–45 nodes): 2–4 children per parent, depth 4–5 with specific leaves.",
};

export function buildMindMapInstructionBlock(
  options?: StudioGenerateOptions,
): string {
  const level = options?.mindMapDetailLevel ?? "balanced";
  return DETAIL_BY_LEVEL[level];
}
