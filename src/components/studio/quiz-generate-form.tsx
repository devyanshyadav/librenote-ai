"use client";

import { forwardRef, useImperativeHandle, useState } from "react";
import type { StudioGenerateFormHandle } from "@/components/studio/studio-generate-form.types";
import { StudioSegmentedField } from "@/components/studio/studio-segmented-field";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  QUIZ_DIFFICULTY_OPTIONS,
  QUIZ_QUESTION_COUNT_OPTIONS,
} from "@/lib/studio/quiz-options";
import type {
  FlashcardDifficulty,
  QuizQuestionCount,
  StudioGenerateOptions,
} from "@/types";

export const QuizGenerateForm = forwardRef<
  StudioGenerateFormHandle,
  { disabled?: boolean }
>(function QuizGenerateForm({ disabled }, ref) {
  const [questionCount, setQuestionCount] =
    useState<QuizQuestionCount>("standard");
  const [difficulty, setDifficulty] = useState<FlashcardDifficulty>("medium");
  const [topic, setTopic] = useState("");

  useImperativeHandle(ref, () => ({
    getOptions: (): StudioGenerateOptions => {
      const options: StudioGenerateOptions = {
        quizQuestionCount: questionCount,
        quizDifficulty: difficulty,
      };
      const topicText = topic.trim();

      if (topicText) {
        options.customPrompt = topicText;
      }

      return options;
    },
    isValid: () => true,
    reset: () => {
      setQuestionCount("standard");
      setDifficulty("medium");
      setTopic("");
    },
  }));

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <StudioSegmentedField
          label="Number of questions"
          value={questionCount}
          options={QUIZ_QUESTION_COUNT_OPTIONS}
          onChange={setQuestionCount}
          disabled={disabled}
        />
        <StudioSegmentedField
          label="Level of difficulty"
          value={difficulty}
          options={QUIZ_DIFFICULTY_OPTIONS}
          onChange={setDifficulty}
          disabled={disabled}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="quiz-topic">What should the topic be?</Label>
        <Textarea
          id="quiz-topic"
          placeholder="e.g. Add 5 questions regarding Shift-Left automation and Level 0 self-service support."
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
