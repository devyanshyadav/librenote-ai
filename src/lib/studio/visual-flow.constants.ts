import { z } from "zod";

export const VISUAL_FLOW_DIAGRAM_TYPES = [
  "flowchart",
  "sequence",
  "class",
  "er",
  "c4",
  "packet",
  "state",
  "journey",
  "git",
  "requirement",
  "kanban",
  "eventmodeling",
  "gantt",
  "timeline",
  "pie",
  "xychart",
  "mindmap",
  "sankey",
  "quadrant",
  "radar",
  "treemap",
  "venn",
  "ishikawa",
] as const;

export const visualFlowDiagramTypeSchema = z.enum(VISUAL_FLOW_DIAGRAM_TYPES);

export type VisualFlowDiagramType = z.infer<typeof visualFlowDiagramTypeSchema>;

export const DEFAULT_VISUAL_FLOW_DIAGRAM_TYPE: VisualFlowDiagramType =
  "flowchart";
