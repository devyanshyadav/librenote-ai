"use client";

import { FileText } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ReportBannerView } from "@/components/studio/viewers/report/report-banner-view";
import { ReportSectionRenderer } from "@/components/studio/viewers/report/report-section-renderer";
import { ReportSummaryView } from "@/components/studio/viewers/report/report-summary-view";
import {
  buildReportToc,
  countReportSections,
  normalizeReportContent,
} from "@/lib/studio/report-content";
import { cn } from "@/lib/utils";
import type { ReportContent, StudioArtifactViewMode } from "@/types";

export function ReportViewer({
  content,
  title: artifactTitle,
  artifactId,
  mode = "studio",
}: {
  content: ReportContent;
  title: string;
  artifactId?: string;
  mode?: StudioArtifactViewMode;
}) {
  const report = useMemo(
    () => normalizeReportContent(content, artifactTitle),
    [content, artifactTitle],
  );

  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  const tocItems = useMemo(() => buildReportToc(report), [report]);
  const sectionCount = useMemo(
    () => countReportSections(report.sections),
    [report.sections],
  );

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries.find((entry) => entry.isIntersecting);
        if (visibleEntry) {
          setActiveSectionId(visibleEntry.target.id);
        }
      },
      {
        root: null,
        rootMargin: "-20% 0px -60% 0px",
        threshold: 0,
      },
    );

    for (const item of tocItems) {
      const element = document.getElementById(item.id);
      if (element) {
        observer.observe(element);
      }
    }

    return () => observer.disconnect();
  }, [tocItems]);

  if (report.sections.length === 0 && !report.summary) {
    return (
      <p className="text-muted-foreground text-sm">No report sections found.</p>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl text-card-foreground">
      <header className="flex flex-col gap-4 relative border-border p-4">
        <div className="min-w-0 space-y-1.5">
          <h1 className="font-semibold text-foreground text-xl tracking-tight md:text-2xl">
            {report.title}
          </h1>
          {report.subtitle ? (
            <p className="text-sm text-muted-foreground">{report.subtitle}</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span className="text-muted-foreground/80">
              {sectionCount} sections · {report.sections.length} parts
            </span>
          </div>
          {report.tags && report.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {report.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs text-primary font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </header>

      {report.banner && report.banner.url ? (
        <div className="p-2">
          <ReportBannerView banner={report.banner} />
        </div>
      ) : null}

      <div className=" @container">
        <section id="report-summary" className="p-4 scroll-mt-24">
          <ReportSummaryView summary={report.summary} />
        </section>
        <div className="grid grid-cols-1 @[700px]:grid-cols-[280px_1fr] gap-6 px-4">
          <aside className="border-border bg-card/50 rounded-xl p-4 @[700px]:sticky @[700px]:top-20 self-start">
            <p className="mb-3 font-semibold text-xs text-muted-foreground uppercase tracking-[0.16em]">
              Contents
            </p>
            <nav className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
              {tocItems.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => scrollToSection(item.id)}
                  className={cn(
                    "shrink-0 rounded-lg px-3 py-2 text-left text-xs transition-colors lg:w-full lg:shrink cursor-pointer",
                    activeSectionId === item.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <span className="mr-2 text-xs text-muted-foreground/50">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="leading-snug">{item.label}</span>
                </button>
              ))}
            </nav>
          </aside>

          <div className="min-w-0 flex-1 space-y-6">
            <div className="space-y-10 border-border border-t p-4 pt-8">
              {report.sections.map((section, index) => (
                <ReportSectionRenderer
                  key={`${section.type}-${index}`}
                  section={section}
                  index={index}
                  className={
                    index > 0 ? "border-border border-t pt-8" : undefined
                  }
                />
              ))}
            </div>

            <div className="relative flex items-center justify-center py-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/60" />
              </div>
              <span className="relative bg-card px-3 text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-bold">
                End
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
