"use client";

import { MessageResponse } from "@/components/ai-elements/message";
import { ReportChartView } from "@/components/studio/viewers/report/report-chart-view";
import { ReportKeyTakeawaysView } from "@/components/studio/viewers/report/report-key-takeaways-view";
import { resolveReportChart } from "@/lib/studio/report-chart-registry";
import { getSectionAnchorId } from "@/lib/studio/report-content";
import { cn } from "@/lib/utils";
import type { ReportSection } from "@/types";

export function ReportSectionRenderer({
  section,
  index,
  className,
}: {
  section: ReportSection;
  index: number;
  className?: string;
}) {
  const id = getSectionAnchorId(section, index);

  switch (section.type) {
    case "key_takeaways":
      return (
        <section id={id} className={cn("scroll-mt-24", className)}>
          <ReportKeyTakeawaysView section={section} />
        </section>
      );

    case "chart":
      return (
        <section id={id} className={cn("scroll-mt-24", className)}>
          <ReportChartView chart={resolveReportChart(section)} />
        </section>
      );

    case "text_section":
      return (
        <section id={id} className={cn("scroll-mt-24 space-y-3", className)}>
          <h2 className="font-semibold text-base text-foreground tracking-tight md:text-lg">
            {section.heading}
          </h2>
          <MessageResponse>{section.content}</MessageResponse>
        </section>
      );
  }
}
