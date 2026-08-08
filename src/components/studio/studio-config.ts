import type { StudioArtifactSlug, StudioArtifactType } from "@/types";
import { STUDIO_ARTIFACT_SLUG_TO_TYPE } from "@/types";

export const STUDIO_FEATURES: {
  slug: StudioArtifactSlug;
  label: string;
  icon: string;
  className: string;
}[] = [
  {
    slug: "mind-map",
    label: "Mind Map",
    icon: "material-symbols:account-tree-outline-rounded",
    className: "size-6",
  },
  {
    slug: "flashcards",
    label: "Flashcards",
    icon: "hugeicons:cards-01",
    className: "size-6",
  },
  {
    slug: "quiz",
    label: "Quiz",
    icon: "hugeicons:quiz-02",
    className: "size-6",
  },
  {
    slug: "report",
    label: "Report",
    icon: "streamline-plump:file-report",
    className: "size-6",
  },
  {
    slug: "data-table",
    label: "Data Table",
    icon: "mdi:table-filter",
    className: "size-6",
  },
  {
    slug: "visual-flow",
    label: "Flowcharts",
    icon: "material-symbols:flowsheet-outline-rounded",
    className: "size-6",
  },
  {
    slug: "audio-overview",
    label: "Audio Overview",
    icon: "hugeicons:ai-audio",
    className: "size-6",
  },
  {
    slug: "note",
    label: "Add Note",
    icon: "proicons:note-add",
    className: "size-7",
  },
];

export const STUDIO_FEATURES_BY_SLUG = Object.fromEntries(
  STUDIO_FEATURES.map((feature) => [feature.slug, feature]),
) as Record<StudioArtifactSlug, (typeof STUDIO_FEATURES)[number]>;

const ARTIFACT_ICONS = Object.fromEntries(
  STUDIO_FEATURES.map((feature) => [
    STUDIO_ARTIFACT_SLUG_TO_TYPE[feature.slug],
    feature.icon,
  ]),
) as Record<StudioArtifactType, string>;

export function getStudioArtifactIcon(type: StudioArtifactType): string {
  return ARTIFACT_ICONS[type];
}

export function formatStudioArtifactType(type: StudioArtifactType): string {
  if (type === "note") {
    return "Note";
  }

  return type.replace(/_/g, " ");
}
