"use client";

import { forwardRef, useImperativeHandle, useState } from "react";
import type { StudioGenerateFormHandle } from "@/components/studio/studio-generate-form.types";
import { StudioSegmentedField } from "@/components/studio/studio-segmented-field";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  FLASHCARD_DECK_SIZE_OPTIONS,
  FLASHCARD_DIFFICULTY_OPTIONS,
} from "@/lib/studio/flashcard-options";
import type {
  FlashcardDeckSize,
  FlashcardDifficulty,
  StudioGenerateOptions,
} from "@/types";

export const FlashcardsGenerateForm = forwardRef<
  StudioGenerateFormHandle,
  { disabled?: boolean }
>(function FlashcardsGenerateForm({ disabled }, ref) {
  const [deckSize, setDeckSize] = useState<FlashcardDeckSize>("standard");
  const [difficulty, setDifficulty] = useState<FlashcardDifficulty>("medium");
  const [topic, setTopic] = useState("");

  useImperativeHandle(ref, () => ({
    getOptions: (): StudioGenerateOptions => {
      const options: StudioGenerateOptions = {
        flashcardDeckSize: deckSize,
        flashcardDifficulty: difficulty,
      };
      const topicText = topic.trim();

      if (topicText) {
        options.customPrompt = topicText;
      }

      return options;
    },
    isValid: () => true,
    reset: () => {
      setDeckSize("standard");
      setDifficulty("medium");
      setTopic("");
    },
  }));

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <StudioSegmentedField
          label="Number of cards"
          value={deckSize}
          options={FLASHCARD_DECK_SIZE_OPTIONS}
          onChange={setDeckSize}
          disabled={disabled}
        />
        <StudioSegmentedField
          label="Level of difficulty"
          value={difficulty}
          options={FLASHCARD_DIFFICULTY_OPTIONS}
          onChange={setDifficulty}
          disabled={disabled}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="flashcards-topic">What should the topic be?</Label>
        <Textarea
          id="flashcards-topic"
          placeholder="e.g. Describe the difference between utility and warranty when assessing the value of a service."
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
