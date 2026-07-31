import type {
  ReportDetailLevel,
  ReportFormat,
  StudioGenerateOptions,
} from "@/types";

export const REPORT_DETAIL_LEVEL_OPTIONS: {
  value: ReportDetailLevel;
  label: string;
}[] = [
  { value: "overview", label: "Overview" },
  { value: "standard", label: "Standard" },
  { value: "comprehensive", label: "Comprehensive" },
];

export const REPORT_FORMAT_OPTIONS: {
  value: ReportFormat;
  label: string;
  description: string;
}[] = [
  {
    value: "executive_summary",
    label: "Executive Summary",
    description: "Board-ready snapshot of conclusions and next steps.",
  },
  {
    value: "research_brief",
    label: "Research Brief",
    description: "Neutral synthesis of findings, themes, and open questions.",
  },
  {
    value: "comparative_analysis",
    label: "Comparative Analysis",
    description: "Side-by-side comparison across sources, options, or views.",
  },
  {
    value: "literature_review",
    label: "Literature Review",
    description: "Thematic review of ideas and evidence in the material.",
  },
  {
    value: "case_study",
    label: "Case Study",
    description:
      "Narrative walkthrough of a situation, decisions, and outcomes.",
  },
  {
    value: "technical_deep_dive",
    label: "Technical Deep Dive",
    description: "Architecture, mechanisms, and implementation detail.",
  },
  {
    value: "policy_brief",
    label: "Policy Brief",
    description: "Problem framing, evidence, stakeholders, and actions.",
  },
  {
    value: "swot_analysis",
    label: "SWOT Analysis",
    description: "Strengths, weaknesses, opportunities, and threats.",
  },
  {
    value: "recommendation_memo",
    label: "Recommendation Memo",
    description: "Clear recommendation with rationale and trade-offs.",
  },
  {
    value: "chronological_report",
    label: "Chronological Report",
    description: "Timeline-driven narrative of events or developments.",
  },
];

const DETAIL_LEVEL_SYSTEM: Record<ReportDetailLevel, string> = {
  overview:
    "Depth: Overview — keep the report concise and high-level; prioritize key takeaways over exhaustive coverage.",
  standard:
    "Depth: Standard — use balanced depth across sections with clear context and supporting detail.",
  comprehensive:
    "Depth: Comprehensive — be very thorough; maximize detail, nuance, and coverage from the sources.",
};

const FORMAT_SYSTEM: Record<ReportFormat, string> = {
  executive_summary:
    "Format: Executive Summary — open with key takeaways, then a short narrative of conclusions, implications, and recommended next steps. Keep sections tight and decision-oriented.",
  research_brief:
    "Format: Research Brief — synthesize what the sources establish, where they agree or diverge, and what remains uncertain. Use thematic text sections after key takeaways.",
  comparative_analysis:
    "Format: Comparative Analysis — structure the body around comparisons across sources, options, or viewpoints. Use charts when numeric comparisons are available.",
  literature_review:
    "Format: Literature Review — organize by themes or schools of thought; summarize contributions from each source and how they relate.",
  case_study:
    "Format: Case Study — tell a coherent story: background, challenge, actions, results, and lessons learned grounded in the sources.",
  technical_deep_dive:
    "Format: Technical Deep Dive — explain how things work, system components, constraints, and trade-offs with precise technical detail.",
  policy_brief:
    "Format: Policy Brief — frame the problem, summarize evidence, note affected stakeholders, and end with concrete policy or action recommendations.",
  swot_analysis:
    "Format: SWOT Analysis — dedicate sections to strengths, weaknesses, opportunities, and threats drawn explicitly from the material.",
  recommendation_memo:
    "Format: Recommendation Memo — state the recommendation early, support it with evidence, address alternatives, and close with implementation considerations.",
  chronological_report:
    "Format: Chronological Report — structure the narrative around a clear timeline; connect events, causes, and consequences in order.",
};

export function buildReportInstructionBlock(
  options?: StudioGenerateOptions,
): string {
  const parts: string[] = [];

  if (options?.reportDetailLevel) {
    parts.push(DETAIL_LEVEL_SYSTEM[options.reportDetailLevel]);
  }

  if (options?.reportFormat) {
    parts.push(FORMAT_SYSTEM[options.reportFormat]);
  }

  return parts.join("\n");
}
