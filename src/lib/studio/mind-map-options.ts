import type { MindMapDetailLevel, StudioGenerateOptions } from "@/types";

export const MIND_MAP_DETAIL_LEVEL_OPTIONS: {
  value: MindMapDetailLevel;
  label: string;
  description: string;
}[] = [
  {
    value: "shallow",
    label: "High-level",
    description: "Main themes only, with minimal branching.",
  },
  {
    value: "balanced",
    label: "Balanced",
    description: "Themes plus supporting concepts and context.",
  },
  {
    value: "deep",
    label: "Deep",
    description: "Maximum drill-down with nested branches and detail.",
  },
];

const DETAIL_LEVEL_SYSTEM: Record<MindMapDetailLevel, string> = {
  shallow:
    "Depth: High-level — keep the map compact (roughly 8–12 nodes). Use one root, a few major branches, and only essential leaves. Avoid deep nesting.",
  balanced:
    "Depth: Balanced — target roughly 15–22 nodes across about three hierarchy levels. Cover major themes and the most important supporting ideas.",
  deep: "Depth: Deep — use as much of the node budget as useful (up to ~30 nodes). Drill down with nested branches, richer leaf summaries, and up to 4 cross-links.",
};

export function buildMindMapInstructionBlock(
  options?: StudioGenerateOptions,
): string {
  const level = options?.mindMapDetailLevel ?? "balanced";
  return DETAIL_LEVEL_SYSTEM[level];
}
