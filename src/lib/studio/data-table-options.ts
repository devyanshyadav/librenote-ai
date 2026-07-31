import { KOKORO_AUDIO_LANGUAGES } from "@/lib/constants/kokoro.constants";
import type {
  AudioLanguage,
  DataTableFormat,
  ReportDetailLevel,
  StudioGenerateOptions,
} from "@/types";

export const DATA_TABLE_LANGUAGE_OPTIONS = KOKORO_AUDIO_LANGUAGES.map(
  (language) => ({
    value: language.value as AudioLanguage,
    label: language.label,
  }),
);

export const DATA_TABLE_DETAIL_LEVEL_OPTIONS: {
  value: ReportDetailLevel;
  label: string;
}[] = [
  { value: "overview", label: "Overview" },
  { value: "standard", label: "Standard" },
  { value: "comprehensive", label: "Comprehensive" },
];

export const DATA_TABLE_FORMAT_OPTIONS: {
  value: DataTableFormat;
  label: string;
  description: string;
}[] = [
  {
    value: "comparison",
    label: "Comparison",
    description: "Side-by-side entities, options, or viewpoints.",
  },
  {
    value: "timeline",
    label: "Timeline",
    description: "Dates, events, and chronological progression.",
  },
  {
    value: "entity_catalog",
    label: "Entity Catalog",
    description: "List of items with descriptive attributes per row.",
  },
  {
    value: "metrics",
    label: "Metrics",
    description: "Numbers, KPIs, and measurable indicators.",
  },
  {
    value: "research_findings",
    label: "Research Findings",
    description: "Papers or sources with title, author, and key result.",
  },
  {
    value: "quotes_by_topic",
    label: "Quotes by Topic",
    description: "Notable quotes grouped by theme and source.",
  },
  {
    value: "requirements_checklist",
    label: "Requirements",
    description: "Requirements, status, owner, and priority columns.",
  },
  {
    value: "pro_con",
    label: "Pros & Cons",
    description: "Advantages and drawbacks across options or ideas.",
  },
  {
    value: "glossary",
    label: "Glossary",
    description: "Terms, definitions, and short explanations.",
  },
  {
    value: "custom",
    label: "Custom",
    description: "Follow the user's column and row instructions closely.",
  },
];

const DETAIL_LEVEL_SYSTEM: Record<ReportDetailLevel, string> = {
  overview:
    "Depth: Overview — keep the table compact with only the highest-signal rows and columns.",
  standard:
    "Depth: Standard — balanced row count and column coverage across the selected sources.",
  comprehensive:
    "Depth: Comprehensive — extract thoroughly; include as many relevant rows and attributes as the sources support.",
};

const LANGUAGE_LABELS: Record<AudioLanguage, string> = Object.fromEntries(
  KOKORO_AUDIO_LANGUAGES.map((language) => [
    language.value,
    language.scriptLabel,
  ]),
) as Record<AudioLanguage, string>;

const FORMAT_SYSTEM: Record<DataTableFormat, string> = {
  comparison:
    "Format: Comparison — use tableKind comparison with columns that support side-by-side evaluation.",
  timeline:
    "Format: Timeline — use tableKind timeline with date-oriented columns and chronological rows.",
  entity_catalog:
    "Format: Entity Catalog — use tableKind entities with one row per item and descriptive attribute columns.",
  metrics:
    "Format: Metrics — use tableKind metrics with numeric or KPI-focused columns.",
  research_findings:
    "Format: Research Findings — prefer columns such as title, author, key result, and source; use tableKind comparison or custom.",
  quotes_by_topic:
    "Format: Quotes by Topic — group rows by topic with quote, author, and source columns.",
  requirements_checklist:
    "Format: Requirements — include requirement, status, owner, and priority-style columns; use badges where helpful.",
  pro_con:
    "Format: Pros & Cons — structure rows around options or themes with clear pro and con columns.",
  glossary:
    "Format: Glossary — one term per row with definition and optional context or source columns.",
  custom:
    "Format: Custom — infer the best tableKind and columns from the user's description.",
};

export function buildDataTableInstructionBlock(
  options?: StudioGenerateOptions,
): string {
  const parts: string[] = [];

  if (options?.dataTableDetailLevel) {
    parts.push(DETAIL_LEVEL_SYSTEM[options.dataTableDetailLevel]);
  }

  if (options?.dataTableFormat) {
    parts.push(FORMAT_SYSTEM[options.dataTableFormat]);
  }

  const language = options?.dataTableLanguage;
  if (language && language !== "en-us") {
    parts.push(
      `Language: Write all column labels and cell values in ${LANGUAGE_LABELS[language]}.`,
    );
  }

  return parts.join("\n");
}
