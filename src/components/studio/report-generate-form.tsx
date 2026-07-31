"use client";

import { forwardRef, useImperativeHandle, useState } from "react";
import type { StudioGenerateFormHandle } from "@/components/studio/studio-generate-form.types";
import { StudioSegmentedField } from "@/components/studio/studio-segmented-field";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  REPORT_DETAIL_LEVEL_OPTIONS,
  REPORT_FORMAT_OPTIONS,
} from "@/lib/studio/report-options";
import { cn } from "@/lib/utils";
import type {
  ReportDetailLevel,
  ReportFormat,
  StudioGenerateOptions,
} from "@/types";

const REPORT_DETAIL_SEGMENTS = REPORT_DETAIL_LEVEL_OPTIONS.map(
  ({ value, label }) => ({ value, label }),
);

export const ReportGenerateForm = forwardRef<
  StudioGenerateFormHandle,
  { disabled?: boolean }
>(function ReportGenerateForm({ disabled }, ref) {
  const [detailLevel, setDetailLevel] = useState<ReportDetailLevel>("standard");
  const [format, setFormat] = useState<ReportFormat>("research_brief");
  const [topic, setTopic] = useState("");

  useImperativeHandle(ref, () => ({
    getOptions: (): StudioGenerateOptions => {
      const options: StudioGenerateOptions = {
        reportDetailLevel: detailLevel,
        reportFormat: format,
      };
      const topicText = topic.trim();

      if (topicText) {
        options.customPrompt = topicText;
      }

      return options;
    },
    isValid: () => true,
    reset: () => {
      setDetailLevel("standard");
      setFormat("research_brief");
      setTopic("");
    },
  }));

  return (
    <div className="space-y-5">
      <StudioSegmentedField
        label="Detail level"
        value={detailLevel}
        options={REPORT_DETAIL_SEGMENTS}
        onChange={setDetailLevel}
        disabled={disabled}
      />

      <div className="space-y-2">
        <Label>Format</Label>
        <div className="mt-2 grid max-h-56 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-4 scroll-fade scrollbar-none">
          {REPORT_FORMAT_OPTIONS.map((option) => {
            const selected = format === option.value;

            return (
              <button
                key={option.value}
                type="button"
                disabled={disabled}
                onClick={() => setFormat(option.value)}
                className={cn(
                  "relative rounded-xl border p-3 text-left ring-3 transition-colors",
                  selected
                    ? "border-primary/40 bg-primary/10 ring-primary/20"
                    : "border-border bg-card/50 ring-muted/50 hover:bg-card",
                )}
              >
                <span className="block font-medium text-sm">
                  {option.label}
                </span>
                <span className="mt-1 block text-muted-foreground text-xs leading-relaxed">
                  {option.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="report-topic">What should the topic be?</Label>
        <Textarea
          id="report-topic"
          placeholder="e.g. Compare market risks versus growth opportunities across the selected sources."
          className="mt-2 min-h-24 resize-none bg-card!"
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          disabled={disabled}
          maxLength={2000}
        />
      </div>
    </div>
  );
});
