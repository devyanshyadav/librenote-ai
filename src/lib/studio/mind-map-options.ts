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
  shallow:
    "High-level: root + 4–6 distinct themes only (~6–10 nodes, 2 levels). No deeper nesting.",
  balanced:
    "Balanced (~18–28 nodes): drill each theme through sub-themes to concrete details (3–4 levels). Keep each parent to 2–4 children.",
  deep: "Deep (~28–40 nodes): 2–4 children per parent, depth 4–5 with specific leaves. Never exceed 5 siblings on one parent.",
};

export function buildMindMapInstructionBlock(
  options?: StudioGenerateOptions,
): string {
  const level = options?.mindMapDetailLevel ?? "balanced";
  return DETAIL_BY_LEVEL[level];
}
