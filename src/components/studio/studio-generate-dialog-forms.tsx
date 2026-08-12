"use client";

import {  useMemo, useState } from "react";
import { AudioOverviewGenerateForm } from "@/components/studio/audio-overview-generate-form";
import { DataTableGenerateForm } from "@/components/studio/data-table-generate-form";
import { FlashcardsGenerateForm } from "@/components/studio/flashcards-generate-form";
import { MindMapGenerateForm } from "@/components/studio/mind-map-generate-form";
import { QuizGenerateForm } from "@/components/studio/quiz-generate-form";
import { ReportGenerateForm } from "@/components/studio/report-generate-form";
import { VisualFlowGenerateForm } from "@/components/studio/visual-flow-generate-form";
import type {
  StudioGenerateFormComponent,
  StudioGenerateFormEntry,
  StudioGenerateFormHandle,
  StudioGenerateFormProps,
} from "@/components/studio/studio-generate-form.types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { StudioArtifactSlug, StudioGenerateOptions } from "@/types";

export type {
  StudioGenerateFormEntry,
  StudioGenerateFormHandle,
} from "@/components/studio/studio-generate-form.types";

type DetailLevel = "overview" | "standard" | "comprehensive";

function buildCustomPrompt(
  ...parts: Array<string | undefined>
): string | undefined {
  const lines = parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));

  return lines.length > 0 ? lines.join("\n") : undefined;
}

const DETAIL_LEVEL_INSTRUCTIONS: Record<DetailLevel, string> = {
  overview: "Keep the output concise and high-level.",
  standard: "Use balanced depth across the output.",
  comprehensive: "Be very thorough with maximum detail and coverage.",
};

const DETAIL_LEVEL_OPTIONS: {
  value: DetailLevel;
  label: string;
  description: string;
}[] = [
  {
    value: "overview",
    label: "Overview",
    description: "Short and high-level.",
  },
  {
    value: "standard",
    label: "Standard",
    description: "Balanced depth for most notebooks.",
  },
  {
    value: "comprehensive",
    label: "Comprehensive",
    description: "Very detailed, maximum coverage.",
  },
];

function useInstructionFields() {
  const [focusTopic, setFocusTopic] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");

  return {
    focusTopic,
    setFocusTopic,
    customPrompt,
    setCustomPrompt,
    reset: () => {
      setFocusTopic("");
      setCustomPrompt("");
    },
    buildOptions: (
      ...extra: Array<string | undefined>
    ): StudioGenerateOptions => {
      const customPromptValue = buildCustomPrompt(
        ...extra,
        focusTopic.trim() ? `Focus more on: ${focusTopic.trim()}.` : undefined,
        customPrompt.trim() || undefined,
      );

      return customPromptValue ? { customPrompt: customPromptValue } : {};
    },
  };
}

function useMaxCountState(max: number) {
  const [value, setValue] = useState("");

  const parsed = useMemo(() => {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }

    const parsedValue = Number.parseInt(trimmed, 10);
    if (!Number.isFinite(parsedValue) || parsedValue < 1) {
      return undefined;
    }

    return Math.min(parsedValue, max);
  }, [max, value]);

  return {
    value,
    setValue,
    parsed,
    isValid: value.trim().length === 0 || parsed !== undefined,
    reset: () => setValue(""),
  };
}

function FocusTopicField({
  id,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>Focus topic (optional)</Label>
      <Input
        id={id}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      />
    </div>
  );
}

function CustomInstructionsField({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>Custom instructions (optional)</Label>
      <Textarea
        id={id}
        placeholder="Anything else the generator should prioritize or avoid..."
        className="min-h-24 resize-none"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      />
    </div>
  );
}

function DetailLevelField({
  value,
  onChange,
  disabled,
}: {
  value: DetailLevel;
  onChange: (value: DetailLevel) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>Detail level</Label>
      <div className="grid gap-2">
        {DETAIL_LEVEL_OPTIONS.map((option) => {
          const selected = value === option.value;

          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className={cn(
                "rounded-xl border px-3 py-2.5 text-left transition-colors",
                selected
                  ? "border-primary/40 bg-primary/10"
                  : "border-border bg-card/40 hover:bg-card",
              )}
            >
              <span className="block font-medium text-sm">{option.label}</span>
              <span className="mt-0.5 block text-muted-foreground text-xs">
                {option.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MaxCountField({
  id,
  label,
  placeholder,
  max,
  value,
  invalid,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  placeholder: string;
  max: number;
  value: string;
  invalid: boolean;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        min={1}
        max={max}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      />
      {invalid ? (
        <p className="text-destructive text-xs">
          Enter a number between 1 and {max}.
        </p>
      ) : null}
    </div>
  );
}
export const STUDIO_GENERATE_FORMS: Record<
  Exclude<StudioArtifactSlug, "note">,
  StudioGenerateFormEntry
> = {
  flashcards: {
    title: "Flashcards",
    description: "Set deck size, difficulty, and what the cards should cover.",
    Form: FlashcardsGenerateForm,
  },
  quiz: {
    title: "Quiz",
    description:
      "Set question count, difficulty, and what the quiz should cover.",
    Form: QuizGenerateForm,
  },
  report: {
    title: "Report",
    description:
      "Choose detail level, format preset, and what the report should focus on.",
    Form: ReportGenerateForm,
  },
  "data-table": {
    title: "Data Table",
    description:
      "Choose language, detail level, format, and describe the table to build.",
    Form: DataTableGenerateForm,
  },
  "mind-map": {
    title: "Mind Map",
    description: "Choose how deep the map goes and what it should focus on.",
    Form: MindMapGenerateForm,
  },
  "visual-flow": {
    title: "Diagrams & Visual Models",
    description:
      "Pick a diagram type and describe the workflow, structure, or concept to visualize.",
    Form: VisualFlowGenerateForm,
  },
  "audio-overview": {
    title: "Audio Overview",
    description:
      "Choose how the audio is delivered, how long it runs, and which language to use.",
    Form: AudioOverviewGenerateForm,
  },
};
