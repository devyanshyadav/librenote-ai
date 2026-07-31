"use client";

import type { ReportSection } from "@/types";

export function ReportKeyTakeawaysView({
  section,
}: {
  section: Extract<ReportSection, { type: "key_takeaways" }>;
}) {
  return (
    <section className="space-y-3 @container">
      <h2 className="font-semibold text-base text-foreground tracking-tight md:text-lg">
        {section.heading}
      </h2>
      <ul className="grid gap-2 grid-cols-1 @[400px]:grid-cols-2">
        {section.items.map((item) => (
          <li
            key={item.title}
            className="rounded-xl px-4 py-3 text-sm leading-relaxed border border-border bg-muted/20 text-muted-foreground"
          >
            <p className="font-medium text-foreground">{item.title}</p>
            {item.detail ? (
              <p className="mt-1 text-muted-foreground/90">{item.detail}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
