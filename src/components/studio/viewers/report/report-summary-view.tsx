"use client";

import { MessageResponse } from "@/components/ai-elements/message";
import { cn } from "@/lib/utils";

export function ReportSummaryView({ summary }: { summary: string }) {
  return (
    <div
      className={cn(
        "space-y-3 bg-muted/30 border ring-3 ring-muted/50 rounded-xl p-4",
      )}
    >
      <p className="font-semibold text-primary text-xs uppercase tracking-[0.16em]">
        Executive summary
      </p>
      <MessageResponse className="text-sm!">{summary}</MessageResponse>
    </div>
  );
}
