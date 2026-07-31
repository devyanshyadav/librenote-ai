"use client";

import { ReportBannerView } from "@/components/studio/viewers/report/report-banner-view";
import { ReportSectionRenderer } from "@/components/studio/viewers/report/report-section-renderer";
import { ReportSummaryView } from "@/components/studio/viewers/report/report-summary-view";
import {
  countReportSections,
  normalizeReportContent,
} from "@/lib/studio/report-content";
import type { ReportContent } from "@/types";
import "./report-print.css";

export function ReportPrintView({
  content,
  title,
}: {
  content: ReportContent;
  title: string;
}) {
  const report = normalizeReportContent(content, title);

  return (
    <article className="report-print-document mx-auto max-w-3xl bg-background px-8 py-10 text-foreground sm:px-12 sm:py-12">
      <header className="report-print-header mb-10 border-border border-b pb-8">
        <p className="font-semibold text-xs text-primary uppercase tracking-[0.18em]">
          Research report
        </p>
        <h1 className="mt-2 font-semibold text-3xl text-foreground tracking-tight">
          {report.title}
        </h1>
        {report.subtitle ? (
          <p className="mt-1 text-muted-foreground text-sm">
            {report.subtitle}
          </p>
        ) : null}
        {report.tags.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {report.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-primary text-xs"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
        <p className="mt-3 text-muted-foreground text-sm">
          {countReportSections(report.sections)} sections ·{" "}
          {report.sections.length} parts
        </p>
      </header>

      {report.banner && report.banner.url ? (
        <div className="report-print-section mb-10">
          <ReportBannerView banner={report.banner} />
        </div>
      ) : null}

      <section id="report-summary" className="report-print-section mb-10">
        <ReportSummaryView summary={report.summary} />
      </section>

      <div className="space-y-10">
        {report.sections.map((section, index) => (
          <ReportSectionRenderer
            key={`${section.type}-${index}`}
            section={section}
            index={index}
            className="report-print-section border-border border-t pt-8 first:border-t-0 first:pt-0"
          />
        ))}
      </div>
      <div className="relative flex items-center justify-center py-8 report-print-section">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <span className="relative bg-background px-3 text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-bold">
          End
        </span>
      </div>
    </article>
  );
}
