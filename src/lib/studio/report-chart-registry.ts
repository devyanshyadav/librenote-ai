import type { ReportSection } from "@/types";

type ReportChartType = "bar" | "line" | "pie" | "area";

type ReportChartId =
  | "bar_comparison"
  | "line_trend"
  | "area_trend"
  | "pie_distribution";

const REPORT_CHART_IDS: ReportChartId[] = [
  "bar_comparison",
  "line_trend",
  "area_trend",
  "pie_distribution",
];

interface ChartPayloadSpec {
  chartId: ReportChartId;
  chartType: ReportChartType;
  description: string;
  requiredStructure: string;
  samplePayload: { label: string; value: number }[];
  xKey: string;
  valueKey: string;
  valueLabel: string;
}

export interface ResolvedReportChart {
  title: string;
  description?: string;
  chartType: ReportChartType;
  xKey: string;
  series: { key: string; label: string; color?: string }[];
  data: Record<string, string | number>[];
}

const CHART_REGISTRY: Record<ReportChartId, ChartPayloadSpec> = {
  bar_comparison: {
    chartId: "bar_comparison",
    chartType: "bar",
    description: "Bar chart for categorical comparisons and ranked values.",
    requiredStructure:
      "dataPoints: array of { label: string, value: number } — label is category, value is the metric",
    samplePayload: [
      { label: "Category A", value: 42 },
      { label: "Category B", value: 31 },
    ],
    xKey: "label",
    valueKey: "value",
    valueLabel: "Value",
  },
  line_trend: {
    chartId: "line_trend",
    chartType: "line",
    description: "Line chart for time-series progression and trends.",
    requiredStructure:
      "dataPoints: array of { label: string, value: number } — label is the time period, value is the metric",
    samplePayload: [
      { label: "2022", value: 12 },
      { label: "2023", value: 18 },
      { label: "2024", value: 24 },
    ],
    xKey: "label",
    valueKey: "value",
    valueLabel: "Value",
  },
  area_trend: {
    chartId: "area_trend",
    chartType: "area",
    description: "Area chart for cumulative or volume trends over time.",
    requiredStructure:
      "dataPoints: array of { label: string, value: number } — label is the time period, value is the metric",
    samplePayload: [
      { label: "Q1", value: 120 },
      { label: "Q2", value: 156 },
      { label: "Q3", value: 189 },
    ],
    xKey: "label",
    valueKey: "value",
    valueLabel: "Value",
  },
  pie_distribution: {
    chartId: "pie_distribution",
    chartType: "pie",
    description: "Pie chart for part-to-whole breakdowns (max 6 slices).",
    requiredStructure:
      "dataPoints: array of { label: string, value: number } — label is the slice name, value is the share",
    samplePayload: [
      { label: "Segment A", value: 45 },
      { label: "Segment B", value: 30 },
      { label: "Segment C", value: 25 },
    ],
    xKey: "label",
    valueKey: "value",
    valueLabel: "Share",
  },
};

export function lookupChartPayloadSpec(chartId: string) {
  if (chartId in CHART_REGISTRY) {
    return CHART_REGISTRY[chartId as ReportChartId];
  }

  return {
    error: `Chart ID "${chartId}" not found.`,
    availableChartIds: REPORT_CHART_IDS,
  };
}

export function resolveReportChart(
  section: Extract<ReportSection, { type: "chart" }>,
): ResolvedReportChart {
  const spec = lookupChartPayloadSpec(section.chartId);
  if ("error" in spec) {
    throw new Error(
      `${spec.error} Available: ${spec.availableChartIds.join(", ")}`,
    );
  }

  return {
    title: section.chartTitle,
    description: section.description,
    chartType: spec.chartType,
    xKey: spec.xKey,
    series: [{ key: spec.valueKey, label: spec.valueLabel }],
    data: section.dataPoints.map((point) => ({
      [spec.xKey]: point.label,
      [spec.valueKey]: point.value,
    })),
  };
}
