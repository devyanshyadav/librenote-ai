import {
  type ReportBanner,
  type ReportContent,
  type ReportSection,
  reportContentSchema,
} from "@/types";

export interface ReportTocItem {
  id: string;
  label: string;
}

export function getReportBannerSrc(banner: ReportBanner) {
  return banner.url;
}

const PLACEHOLDER_URL_MARKERS = ["placeholder", "example.com"];

export const REPORT_BANNER_PLACEHOLDER_URL =
  "https://placehold.co/1200x514/png?text=Report";

export function isInvalidReportBannerUrl(url: string | undefined): boolean {
  if (!url?.trim()) {
    return true;
  }

  if (url === REPORT_BANNER_PLACEHOLDER_URL) {
    return false;
  }

  const lower = url.toLowerCase();
  return PLACEHOLDER_URL_MARKERS.some((marker) => lower.includes(marker));
}

function slugifyReportHeading(heading: string, index: number) {
  const slug = heading
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `report-section-${index}-${slug || "part"}`;
}

export function getSectionAnchorId(section: ReportSection, index: number) {
  switch (section.type) {
    case "key_takeaways":
      return "report-key-takeaways";
    case "text_section":
      return slugifyReportHeading(section.heading, index);
    case "chart":
      return slugifyReportHeading(section.chartTitle, index);
  }
}

export function getSectionLabel(section: ReportSection) {
  switch (section.type) {
    case "key_takeaways":
      return section.heading;
    case "text_section":
      return section.heading;
    case "chart":
      return section.chartTitle;
  }
}

export function normalizeReportContent(
  content: unknown,
  fallbackTitle = "Research report",
): ReportContent {
  const parsed = reportContentSchema.safeParse(content);
  if (parsed.success) {
    return parsed.data;
  }

  return {
    title: fallbackTitle,
    summary: "",
    tags: [],
    sections: [],
  };
}

export function buildReportToc(report: ReportContent): ReportTocItem[] {
  return [
    { id: "report-summary", label: "Executive summary" },
    ...report.sections.map((section, index) => ({
      id: getSectionAnchorId(section, index),
      label: getSectionLabel(section),
    })),
  ];
}

export function countReportSections(sections: ReportSection[]) {
  return sections.filter((section) => section.type === "text_section").length;
}
