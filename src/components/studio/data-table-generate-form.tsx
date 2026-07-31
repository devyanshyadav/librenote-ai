"use client";

import { forwardRef, useImperativeHandle, useState } from "react";
import type { StudioGenerateFormHandle } from "@/components/studio/studio-generate-form.types";
import { StudioSegmentedField } from "@/components/studio/studio-segmented-field";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  DATA_TABLE_DETAIL_LEVEL_OPTIONS,
  DATA_TABLE_FORMAT_OPTIONS,
  DATA_TABLE_LANGUAGE_OPTIONS,
} from "@/lib/studio/data-table-options";
import { DEFAULT_KOKORO_AUDIO_LANGUAGE } from "@/lib/constants/kokoro.constants";
import { cn } from "@/lib/utils";
import type {
  AudioLanguage,
  DataTableFormat,
  ReportDetailLevel,
  StudioGenerateOptions,
} from "@/types";

const DATA_TABLE_DETAIL_SEGMENTS = DATA_TABLE_DETAIL_LEVEL_OPTIONS.map(
  ({ value, label }) => ({ value, label }),
);

const DESCRIPTION_PLACEHOLDER = `Things to try:
• Create a table with the major findings in these research papers, using columns: title, author, key result
• Extract the most important quotes from my readings, grouping them by topic and author
• List vacation destinations in Italy with city, best time to visit, attractions, and cost`;

export const DataTableGenerateForm = forwardRef<
  StudioGenerateFormHandle,
  { disabled?: boolean }
>(function DataTableGenerateForm({ disabled }, ref) {
  const [language, setLanguage] = useState<AudioLanguage>(
    DEFAULT_KOKORO_AUDIO_LANGUAGE,
  );
  const [detailLevel, setDetailLevel] = useState<ReportDetailLevel>("standard");
  const [format, setFormat] = useState<DataTableFormat>("comparison");
  const [description, setDescription] = useState("");

  useImperativeHandle(ref, () => ({
    getOptions: (): StudioGenerateOptions => {
      const options: StudioGenerateOptions = {
        dataTableLanguage: language,
        dataTableDetailLevel: detailLevel,
        dataTableFormat: format,
      };
      const descriptionText = description.trim();

      if (descriptionText) {
        options.customPrompt = descriptionText;
      }

      return options;
    },
    isValid: () => true,
    reset: () => {
      setLanguage(DEFAULT_KOKORO_AUDIO_LANGUAGE);
      setDetailLevel("standard");
      setFormat("comparison");
      setDescription("");
    },
  }));

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="data-table-language">Choose language</Label>
          <Select
            value={language}
            onValueChange={(value) => setLanguage(value as AudioLanguage)}
            disabled={disabled}
          >
            <SelectTrigger
              id="data-table-language"
              className="mt-2 h-10! w-full bg-card!"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATA_TABLE_LANGUAGE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <StudioSegmentedField
          label="Detail level"
          value={detailLevel}
          options={DATA_TABLE_DETAIL_SEGMENTS}
          onChange={setDetailLevel}
          disabled={disabled}
        />
      </div>

      <div className="space-y-2">
        <Label>Format</Label>
        <div className="mt-2 grid max-h-56 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-5 p-1 scroll-fade scrollbar-none">
          {DATA_TABLE_FORMAT_OPTIONS.map((option) => {
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
        <Label htmlFor="data-table-description">
          Describe the data table you want to create
        </Label>
        <Textarea
          id="data-table-description"
          placeholder={DESCRIPTION_PLACEHOLDER}
          className="mt-2 min-h-32 resize-none bg-card!"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          disabled={disabled}
          maxLength={2000}
        />
      </div>
    </div>
  );
});
