"use client";

import { forwardRef, useImperativeHandle, useState } from "react";
import type { StudioGenerateFormHandle } from "@/components/studio/studio-generate-form.types";
import { StudioSegmentedField } from "@/components/studio/studio-segmented-field";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MIND_MAP_DETAIL_LEVEL_OPTIONS } from "@/lib/studio/mind-map-options";
import type { MindMapDetailLevel, StudioGenerateOptions } from "@/types";

const MIND_MAP_DETAIL_SEGMENTS = MIND_MAP_DETAIL_LEVEL_OPTIONS.map(
  ({ value, label }) => ({ value, label }),
);

export const MindMapGenerateForm = forwardRef<
  StudioGenerateFormHandle,
  { disabled?: boolean }
>(function MindMapGenerateForm({ disabled }, ref) {
  const [detailLevel, setDetailLevel] =
    useState<MindMapDetailLevel>("balanced");
  const [topic, setTopic] = useState("");

  const selectedDetail = MIND_MAP_DETAIL_LEVEL_OPTIONS.find(
    (option) => option.value === detailLevel,
  );

  useImperativeHandle(ref, () => ({
    getOptions: (): StudioGenerateOptions => {
      const options: StudioGenerateOptions = {
        mindMapDetailLevel: detailLevel,
      };
      const topicText = topic.trim();

      if (topicText) {
        options.customPrompt = topicText;
      }

      return options;
    },
    isValid: () => true,
    reset: () => {
      setDetailLevel("balanced");
      setTopic("");
    },
  }));

  return (
    <div className="space-y-5">
      <StudioSegmentedField
        label="Detail level"
        value={detailLevel}
        options={MIND_MAP_DETAIL_SEGMENTS}
        onChange={setDetailLevel}
        disabled={disabled}
      />
      {selectedDetail ? (
        <p className="-mt-3 text-muted-foreground text-xs leading-relaxed">
          {selectedDetail.description}
        </p>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="mind-map-topic">What should the topic be?</Label>
        <Textarea
          id="mind-map-topic"
          placeholder="e.g. Limit the map to one source, or focus on the core ideas in quantum physics."
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
